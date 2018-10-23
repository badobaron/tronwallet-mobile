import React, { Component } from 'react'
import { FlatList, AsyncStorage, Platform, Image } from 'react-native'
import { Answers } from 'react-native-fabric'

import tl from '../../utils/i18n'
import Transaction from './Transaction'
import { Background, InnerRow, FilterText, FilterWrapper } from './elements'
import NavigationHeader from '../../components/Navigation/Header'
import SyncButton from '../../components/SyncButton'
import { USER_FILTERED_TOKENS } from '../../utils/constants'

import getAssetsStore from '../../store/assets'
import getTransactionStore from '../../store/transactions'
import { withContext } from '../../store/context'
import { updateTransactions, getTokenPriceFromStore } from '../../utils/transactionUtils'
import getContactsStore from '../../store/contacts'
import { logSentry } from '../../utils/sentryUtils'
import { Colors } from '../../components/DesignSystem'
import Empty from './Empty'
import FontelloButton from '../../components/FontelloButton'

class TransactionsScene extends Component {
  static navigationOptions = () => ({header: null})

  state = {
    refreshing: true,
    transactions: [],
    currentAlias: '',
    userTokens: [],
    contact: {
      address: '',
      alias: '',
      name: ''
    }
  }

  async componentDidMount () {
    Answers.logContentView('Tab', 'Transactions')
    this._didFocusSubscription = this.props.navigation.addListener('didFocus', this._onRefresh)
  }

  componentWillUnmount () {
    this._didFocusSubscription.remove()
  }

  _getAlias = address => {
    if (!address) return
    const contact = this.contactsStoreRef.objects('Contact').filtered('address = $0', address)
    return contact.length ? contact[0].alias : address
  }

  _getDataFromStore = async () => {
    const { userTokens } = this.state
    const filteredTokens = JSON.parse(userTokens)
    const transactions = this.transactionStoreRef
      .objects('Transaction')
      .sorted([['timestamp', true]])
      .filter(({ type, contractData, ownerAddress }) =>
        (contractData.tokenName === null || filteredTokens.indexOf(contractData.tokenName) === -1) &&
        ownerAddress === this.props.context.publicKey)
    const filteredTransactions = this._setTransactionsAlias(transactions)

    const assetStore = await getAssetsStore()
    return this._updateParticipateTransactions(filteredTransactions, assetStore)
  }

  _onRefresh = async () => {
    this.setState({ refreshing: true })
    try {
      [this.transactionStoreRef, this.contactsStoreRef] =
        await Promise.all([getTransactionStore(), getContactsStore()])

      const userTokens = await AsyncStorage.getItem(USER_FILTERED_TOKENS)
      const currentAlias = this._getAlias(this.props.context.publicKey)
      const contact = this.props.navigation.getParam('contact', null)

      this.setState({currentAlias, userTokens})
      if (contact) await this._setFilteredContact(contact)
      else await this._updateData()
    } catch (error) {
      logSentry(error, 'On Refresh - Transactions')
    } finally {
      this.setState({ refreshing: false })
    }
  }

  _setTransactionsAlias = transactions =>
    transactions.slice(0, 100).map(item => Object.assign({},
      {...item,
        contractData: {
          ...item.contractData,
          transferFromAddress: this._getAlias(item.contractData.transferFromAddress),
          transferToAddress: this._getAlias(item.contractData.transferToAddress)
        }}))

  _setFilteredContact = async contact => {
    const assetStore = await getAssetsStore()
    const transactions = this.transactionStoreRef.objects('Transaction')
      .filtered('contractData.transferFromAddress = $0 OR contractData.transferToAddress = $0', contact.address)
      .sorted([['timestamp', true]])
      .map(item => Object.assign({}, item))
    const transactionsFiltered = this._setTransactionsAlias(transactions)
    const updatedParticipatedTransactions = this._updateParticipateTransactions(transactionsFiltered, assetStore)

    this.setState({transactions: updatedParticipatedTransactions, contact})
  }

  _removeFilteredContact = async () => {
    this.setState({refreshing: true, contact: { address: '', alias: '', name: '' }})
    this.props.navigation.setParams({contact: null})
    try {
      const updatedTransactions = await this._getDataFromStore()
      this.setState({ transactions: updatedTransactions })
    } catch (error) {
      logSentry(error, 'Remove filterd contact')
    } finally {
      this.setState({refreshing: false})
    }
  }

  _updateData = async () => {
    try {
      await updateTransactions(this.props.context.publicKey)
      const updatedTransactions = await this._getDataFromStore()
      this.setState({ transactions: updatedTransactions })
    } catch (err) {
      logSentry(err, 'Transactions - load data')
    } finally {
      this.setState({refreshing: false, contact: {address: '', alias: '', name: ''}})
    }
  }

  _updateParticipateTransactions = (transactions, assetStore) => (
    transactions.map((transaction) => {
      if (transaction.type === 'Participate') {
        const tokenPrice = getTokenPriceFromStore(transaction.contractData.tokenName, assetStore)
        return { ...transaction, tokenPrice }
      } else {
        return transaction
      }
    })
  )

  _navigateToDetails = item => this.props.navigation.navigate('TransactionDetails', { item })

  _renderFilter = () => {
    if (this.state.contact.address) {
      return <FilterWrapper>
        <InnerRow>
          <Image
            source={require('../../assets/gradient-book.png')}
            style={{width: 16, height: 16}}
            color={Colors.buttonGradient[1]}
          />
          <FilterText marginX={12} dark>{tl.t('filter')}:</FilterText>
          <FilterText numberOfLines={1}>{this.state.contact.alias}</FilterText>
        </InnerRow>
        <InnerRow>
          <FontelloButton
            onPress={this._removeFilteredContact}
            name='close'
            color='white'
            size={16}
          />
        </InnerRow>
      </FilterWrapper>
    } else {
      return null
    }
  }
  render () {
    const { refreshing, currentAlias, transactions } = this.state
    const { publicKey } = this.props.context

    return (
      <Background>
        <NavigationHeader
          title={tl.t('transactions.title')}
          leftButton={<SyncButton
            loading={refreshing}
            onPress={this._onRefresh}
          />}
        />
        <FlatList
          data={transactions}
          ListEmptyComponent={<Empty loading={refreshing} />}
          ListHeaderComponent={this._renderFilter}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <Transaction item={item} currentAlias={currentAlias} onPress={() => this._navigateToDetails(item)} publicKey={publicKey} />}
          initialNumToRender={10}
          onEndReachedThreshold={0.75}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </Background>
    )
  }
}

export default withContext(TransactionsScene)
