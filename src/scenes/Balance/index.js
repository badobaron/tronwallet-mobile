import React, { Component } from 'react'
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity
} from 'react-native'
import { Answers } from 'react-native-fabric'
import unionBy from 'lodash/unionBy'
import Feather from 'react-native-vector-icons/Feather'

import FormModal from '../../components/FormModal'
import SyncButton from '../../components/SyncButton'
import NavigationHeader from '../../components/Navigation/Header'
import * as Utils from '../../components/Utils'
import WalletBalances from './WalletBalances'
import BalanceWarning from './BalanceWarning'
import BalanceNavigation from './BalanceNavigation'
import AccountsCarousel from './AccountsCarousel'

import tl from '../../utils/i18n'
import { isNameValid, isAliasUnique } from '../../utils/validations'
import { formatAlias } from '../../utils/contactUtils'
import { createNewAccount } from '../../utils/secretsUtils'
import withContext from '../../utils/hocs/withContext'
import { logSentry } from '../../utils/sentryUtils'
import onBackgroundHandler from '../../utils/onBackgroundHandler'

class BalanceScene extends Component {
  static navigationOptions = {
    header: null
  }

  state = {
    refreshing: false,
    creatingNewAccount: false,
    error: null,
    balances: [],
    currency: null,
    accountModalVisible: false,
    newAccountName: ''
  }

  componentDidMount () {
    Answers.logContentView('Tab', 'Balance')
    this._navListener = this.props.navigation.addListener('didFocus', this._loadData)
    this.appStateListener = onBackgroundHandler(this._onAppStateChange)
  }

  componentWillUnmount () {
    this._navListener.remove()
    this.appStateListener.remove()
  }

  _createAccountPressed = () => {
    const { userSecrets } = this.props.context
    const newAccountName = `Account ${userSecrets.length}`

    this.setState({ accountModalVisible: true, newAccountName, accountNameError: null })
  }

  _validateAccountName = async (name) => {
    if (name) {
      if (!isNameValid(name)) {
        return tl.t('addressBook.form.nameError')
      }

      const aliasIsUnique = await isAliasUnique(formatAlias(name), this.props.context.pin)
      if (!aliasIsUnique) {
        return tl.t('addressBook.form.uniqueAliasError')
      }
    }

    return null
  }

  _handleAccountNameChange = async (name) => {
    const accountNameError = await this._validateAccountName(name)
    this.setState({ newAccountName: name, accountNameError })
  }

  _addNewAccount = async () => {
    const { newAccountName } = this.state
    const { pin, oneSignalId, loadUserData } = this.props.context
    this.setState({ creatingNewAccount: true, accountModalVisible: false })
    try {
      const createdNewAccount = await createNewAccount(pin, oneSignalId, newAccountName)
      if (createdNewAccount) {
        await loadUserData()
        this.carousel.innerComponent._snapToNewAccount()
      }
    } catch (error) {
      logSentry(error, 'Error creating new Account')
    } finally {
      this.setState({ creatingNewAccount: false })
    }
  }

  _onRefresh = async () => {
    this.setState({ refreshing: true })
    await this._loadData()
    this.setState({ refreshing: false })
  }

  _onAppStateChange = nextAppState => {
    const { alwaysAskPin } = this.props.context
    if (nextAppState.match(/background/)) {
      // Closing all modals
      this.setState({ accountModalVisible: false })
      if (this.carousel.innerComponent.ActionSheet && this.carousel.innerComponent.ActionSheet.hide) {
        this.carousel.innerComponent.ActionSheet.hide()
      }

      if (alwaysAskPin) {
        this.props.navigation.navigate('Pin', {
          testInput: pin => pin === this.props.context.pin,
          onSuccess: () => {}
        })
      }
    }
  }

  _loadData = async () => {
    try {
      this.props.context.loadUserData()
      this.props.context.updateSystemStatus()
    } catch (e) {
      this.setState({ error: tl.t('balance.error.loadingData') })
      logSentry(e, 'Balance - LoadData')
    }
  }

  _rightButtonHeader = () => {
    const { secretMode } = this.props.context
    const { creatingNewAccount } = this.state
    if (secretMode === 'privatekey') {
      return null
    } else {
      return <TouchableOpacity onPress={this._createAccountPressed} disabled={creatingNewAccount}>
        {creatingNewAccount
          ? <SyncButton
            loading
            onPress={() => { }}
          />
          : <Feather name='plus' color={'white'} size={28} />
        }
      </TouchableOpacity>
    }
  }

  _getBalancesToDisplay = () => {
    const { balances, publicKey, fixedTokens } = this.props.context

    if (balances[publicKey]) {
      const featuredBalances = fixedTokens.map(token => { return { name: token, balance: 0 } })
      return unionBy(balances[publicKey], featuredBalances, 'name')
    }

    return []
  }

  render () {
    const {
      seed,
      refreshing,
      accountModalVisible,
      newAccountName,
      accountNameError
    } = this.state
    const { accounts } = this.props.context
    return (
      <React.Fragment>
        <NavigationHeader
          title={tl.t('balance.title')}
          rightButton={this._rightButtonHeader()}
        />
        <Utils.Container justify='flex-start' align='stretch'>
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh}
              />
            }
          >
            <AccountsCarousel ref={input => (this.carousel = input)} />
            <Utils.VerticalSpacer size='medium' />
            <Utils.Content paddingTop={0}>
              <BalanceNavigation navigation={this.props.navigation} />
              {accounts[0] && !accounts[0].confirmed && (
                <BalanceWarning seed={seed} navigation={this.props.navigation}>
                  {tl.t('balance.confirmSeed')}
                </BalanceWarning>
              )}
              <WalletBalances balances={this._getBalancesToDisplay()} />
            </Utils.Content>
          </ScrollView>
        </Utils.Container>
        <FormModal
          title={tl.t('newAccount.title')}
          error={accountNameError}
          inputLabel={tl.t('addressBook.form.name')}
          inputValue={newAccountName}
          inputPlaceholder={tl.t('newAccount.placeholder')}
          onChangeText={this._handleAccountNameChange}
          buttonText={tl.t(`addressBook.shared.add`)}
          onButtonPress={this._addNewAccount}
          buttonDisabled={!!accountNameError || !newAccountName}
          visible={accountModalVisible}
          closeModal={() => this.setState({ accountModalVisible: false })}
          animationType='fade'
        />
      </React.Fragment>
    )
  }
}

export default withContext(BalanceScene)
