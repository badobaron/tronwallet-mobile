import React, { Component } from 'react'
import { StatusBar, Platform, YellowBox, SafeAreaView, AsyncStorage } from 'react-native'
import {
  createBottomTabNavigator,
  createStackNavigator,
  createMaterialTopTabNavigator
} from 'react-navigation'
import { createIconSetFromFontello } from 'react-native-vector-icons'
import axios from 'axios'
import Config from 'react-native-config'
import OneSignal from 'react-native-onesignal'
import { Sentry } from 'react-native-sentry'
import { logSentry } from './src/utils/sentryUtils'

import { Colors, ScreenSize } from './src/components/DesignSystem'

import LoadingScene from './src/scenes/Loading'
import SendScene from './src/scenes/Send'
import MarketScene from './src/scenes/Market'
import BalanceScene from './src/scenes/Balance'
import VoteScene from './src/scenes/Vote'
import ReceiveScene from './src/scenes/Receive'
import TransactionListScene from './src/scenes/Transactions'
import SubmitTransactionScene from './src/scenes/SubmitTransaction'
import FreezeScene from './src/scenes/Freeze'
import Settings from './src/scenes/Settings'
import About from './src/scenes/About'
import TokenInfoScene from './src/scenes/Participate/TokenInfo'
import BuyScene from './src/scenes/Participate/Buy'
import GetVaultScene from './src/scenes/GetVault'
import FreezeVoteScene from './src/components/Vote/Freeze'
import RewardsScene from './src/scenes/Rewards'
import NetworkConnection from './src/scenes/Settings/NetworkModal'
import SeedSave from './src/scenes/Seed/Save'
import SeedRestore from './src/scenes/Seed/Restore'
import SeedConfirm from './src/scenes/Seed/Confirm'
import TransactionDetails from './src/scenes/TransactionDetails'
import ParticipateHome from './src/scenes/Participate'
import Pin from './src/scenes/Pin'
import FirstTime from './src/scenes/FirstTime'
import TransactionSuccess from './src/scenes/TransactionSuccess'
import AccountsScene from './src/scenes/Accounts'
import ContactsScene from './src/scenes/Contacts'
import EditAddressBookItem from './src/scenes/EditAddressBookItem'
import AddContactScene from './src/scenes/Contacts/Add'
import NavigationHeader from './src/components/Navigation/Header'
import MakePayScene from './src/scenes/Payments/Make'
import PaymentsScene from './src/scenes/Payments'
import ScanPayScene from './src/scenes/Payments/Scan'
import CreateSeed from './src/scenes/Seed/Create'
import ImportWallet from './src/scenes/Seed/Import'

import Client from './src/services/client'
import { Context } from './src/store/context'
import NodesIp from './src/utils/nodeIp'
import { getUserSecrets } from './src/utils/secretsUtils'
import getBalanceStore from './src/store/balance'
import { USER_PREFERRED_CURRENCY, ALWAYS_ASK_PIN, USE_BIOMETRY, TOKENS_VISIBLE } from './src/utils/constants'
import { ONE_SIGNAL_KEY } from './config'
import ConfigJson from './package.json'
import tl from './src/utils/i18n'
import fontelloConfig from './src/assets/icons/config.json'
import { getFixedTokens, getSystemStatus } from './src/services/contentful'
import StatusMessage from './src/components/StatusMessage'
import './ReactotronConfig'

if (!__DEV__) {
  Sentry.config('https://8ffba48a3f30473883ba930c49ab233d@sentry.io/1236809', {
    disableNativeIntegration: Platform.OS === 'android',
    release: ConfigJson.version
  }).install()
}
const Icon = createIconSetFromFontello(fontelloConfig, 'tronwallet')

YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader'])

const SettingsStack = createStackNavigator({
  Settings,
  About,
  SeedSave,
  SeedConfirm,
  NetworkConnection
}, {
  navigationOptions: {
    headerStyle: {
      backgroundColor: Colors.background,
      elevation: 0,
      borderColor: Colors.background
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontFamily: 'rubik-medium'
    }
  }
})

const tabWidth = ScreenSize.width / 2
const indicatorWidth = 15
const AddressBookTabs = createMaterialTopTabNavigator(
  {
    Contacts: ContactsScene,
    Accounts: AccountsScene
  },
  {
    navigationOptions: { header: null },
    tabBarOptions: {
      activeTintColor: Colors.primaryText,
      inactiveTintColor: '#66688f',
      style: {
        paddingTop: 10,
        backgroundColor: Colors.background,
        elevation: 0
      },
      labelStyle: {
        fontSize: 12,
        lineHeight: 12,
        letterSpacing: 0.6,
        fontFamily: 'Rubik-Medium'
      },
      indicatorStyle: {
        width: indicatorWidth,
        height: 1.2,
        marginLeft: tabWidth / 2 - indicatorWidth / 2
      }
    }
  }
)

const AddressBookStack = createStackNavigator({
  AddressBook: AddressBookTabs,
  EditAddressBookItem,
  AddContact: AddContactScene
}, {
  navigationOptions: {
    header: <NavigationHeader title={tl.t('addressBook.title')} />
  }
})

const BalanceStack = createStackNavigator({
  BalanceScene,
  ReceiveScene,
  FreezeScene,
  SendScene,
  PaymentsScene,
  MakePayScene,
  ScanPayScene,
  TokenDetailScene: TokenInfoScene
})

const TransactionList = createStackNavigator({
  TransactionListScene,
  TransactionDetails
})

const ParticipateStack = createStackNavigator(
  {
    ParticipateHome,
    TokenInfo: TokenInfoScene,
    Buy: BuyScene
  }
)

const AppTabs = createBottomTabNavigator({
  Market: MarketScene,
  Vote: {
    screen: VoteScene,
    path: 'vote'
  },
  AddressBook: AddressBookStack,
  Balance: BalanceStack,
  Transactions: TransactionList,
  Participate: ParticipateStack,
  Settings: SettingsStack
}, {
  navigationOptions: ({ navigation }) => ({
    tabBarIcon: ({ focused, tintColor }) => {
      const { routeName } = navigation.state
      let iconName
      if (routeName === 'Market') {
        iconName = `graph,-bar,-chart,-statistics,-analytics`
      } else if (routeName === 'Balance') {
        iconName = `wallet,-money,-cash,-balance,-purse`
      } else if (routeName === 'Transfer') {
        iconName = `fly,-send,-paper,-submit,-plane`
      } else if (routeName === 'AddressBook') {
        iconName = `diary,-contact,-address,-organizer,-book`
      } else if (routeName === 'Vote') {
        iconName = `shout-out,-speaker,-offer,-announcement,-loud`
      } else if (routeName === 'Transactions') {
        iconName = `network,-arrow,-up-dowm,-mobile-data,-send-receive`
      } else if (routeName === 'Receive') {
        iconName = `scan,-bar-code,-qr-code,-barcode,-scanner`
      } else if (routeName === 'Settings') {
        iconName = `gear,-settings,-update,-setup,-config`
      } else if (routeName === 'Participate') {
        iconName = `dollar,-currency,-money,-cash,-coin`
      }

      return <Icon name={iconName} size={26} color={tintColor} />
    }
  }),
  tabBarOptions: {
    activeTintColor: Colors.primaryText,
    inactiveTintColor: Colors.secondaryText,
    style: {
      backgroundColor: 'black'
    },
    showLabel: false
  },
  initialRouteName: 'Balance'
})

const RootNavigator = createStackNavigator({
  Loading: LoadingScene,
  CreateSeed,
  FirstTime,
  Pin,
  SeedRestore,
  ImportWallet,
  App: AppTabs,
  GetVault: GetVaultScene,
  SubmitTransaction: {
    screen: SubmitTransactionScene,
    path: 'transaction/:tx'
  },
  TransactionSuccess,
  Freeze: FreezeVoteScene,
  Rewards: RewardsScene
}, {
  mode: 'modal',
  navigationOptions: {
    gesturesEnabled: false,
    header: null
  },
  cardStyle: { shadowColor: 'transparent' }
})

const prefix =
  Platform.OS === 'android' ? 'tronwalletmobile://tronwalletmobile/' : 'tronwalletmobile://'

class App extends Component {
  state = {
    price: {},
    freeze: {},
    balances: {},
    accounts: [],
    userSecrets: [],
    publicKey: null,
    pin: null,
    oneSignalId: null,
    shareModal: false,
    queue: null,
    alwaysAskPin: true,
    useBiometry: false,
    currency: null,
    secretMode: 'mnemonic',
    verifiedTokensOnly: true,
    fixedTokens: [],
    systemStatus: { showStatus: false, statusMessage: '', statusColor: '', messageColor: '' }
  }

  async componentDidMount () {
    setTimeout(() => {
      OneSignal.init(ONE_SIGNAL_KEY)
      OneSignal.inFocusDisplaying(2)
      OneSignal.addEventListener('ids', this._onIds)
      OneSignal.addEventListener('opened', this._onOpened)
      OneSignal.addEventListener('received', this._onReceived)
      OneSignal.configure()
    }, 1000)

    this._updateSystemStatus()
    this._setNodes()
    this._loadAskPin()
    this._loadUseBiometry()
    this._loadVerifiedTokenFlag()
    this._loadFixedTokens()
    this._loadCurrency()
  }

  componentWillUnmount () {
    OneSignal.removeEventListener('ids', this._onIds)
    OneSignal.removeEventListener('opened', this._onOpened)
    OneSignal.removeEventListener('received', this._onReceived)
  }

  _onIds = device => {
    // console.log('Device info: ', device)
    this.setState({ oneSignalId: device.userId })
  }

  _onReceived = notification => {
    // console.log('Notification received: ', notification)
  }

  _onOpened = openResult => {
    // console.log('Message: ', openResult.notification.payload.body)
    // console.log('Data: ', openResult.notification.payload.additionalData)
    // console.log('isActive: ', openResult.notification.isAppInFocus)
    // console.log('openResult: ', openResult)
  }
  _loadUserData = async () => {
    // accounts = filtered accounts by hidden status
    // userSecrets =  ref to all userSecrets
    let accounts = await getUserSecrets(this.state.pin)
    const userSecrets = accounts
    // First Time
    if (!accounts.length) return

    // merge store with state
    accounts = accounts
      .filter(account => !account.hide)
      .map(account => {
        const stateAccount = this.state.accounts.find(item => item.address === account.address)
        return Object.assign({}, stateAccount, account)
      })

    this.setState({ accounts, userSecrets }, async () => {
      await this._updateAccounts(accounts)
      if (!this.state.publicKey) {
        const { address } = accounts[0]
        this.setState({ publicKey: address })
      }
    })
  }

  _updateAccounts = async (accountsArray = []) => {
    const accountDataArray = await Promise.all(accountsArray.map(acc => Client.getAccountData(acc.address)))
    const updatedBalanceData = {}
    const updatedFreezeData = {}
    const updatedAccounDataArray = accountsArray.map((prevAccount, index) => {
      const { balanceTotal, freezeData, balancesData } = accountDataArray
        .find(ada => ada.address === prevAccount.address)

      updatedBalanceData[prevAccount.address] = balancesData
      updatedFreezeData[prevAccount.address] = freezeData

      prevAccount.balance = balanceTotal
      prevAccount.tronPower = freezeData.total
      prevAccount.bandwidth = freezeData.bandwidth.netRemaining

      getBalanceStore().then(store => {
        store.write(() => {
          balancesData.map(item =>
            store.create('Balance', {
              ...item,
              account: prevAccount.address,
              id: `${prevAccount.address}${item.name}`
            }, true))
        })
      })

      return prevAccount
    })

    this.setState({ accounts: updatedAccounDataArray, balances: updatedBalanceData, freeze: updatedFreezeData })
  }

  _setCurrency = currency => {
    this.setState({ currency }, () => AsyncStorage.setItem(USER_PREFERRED_CURRENCY, currency))
    if (!this.state.price[currency]) this._getPrice(currency)
  }

  _getPrice = async (currency = 'TRX') => {
    try {
      const { data: { data } } = await axios.get(`${Config.TRX_PRICE_API}/?convert=${currency}`)
      const { price } = this.state
      price[currency] = data.quotes[currency]
      if (currency !== 'USD') {
        price.USD = data.quotes.USD
      }
      this.setState({ price, circulatingSupply: data.circulating_supply })
    } catch (e) {
      logSentry(e, 'App - GetPrice')
    }
  }

  _loadAskPin = async () => {
    try {
      const askPin = await AsyncStorage.getItem(ALWAYS_ASK_PIN)
      const alwaysAskPin = askPin === null ? true : askPin === 'true'
      this.setState({ alwaysAskPin })
    } catch (error) {
      this.setState({ alwaysAskPin: true })
    }
  }

  _loadUseBiometry = async () => {
    try {
      const useBiometry = await AsyncStorage.getItem(USE_BIOMETRY)
      this.setState({ useBiometry: useBiometry === null ? false : useBiometry === 'true' })
    } catch (error) {
      this.setState({ useBiometry: false })
    }
  }

  _loadVerifiedTokenFlag = async () => {
    try {
      const tokenVibility = await AsyncStorage.getItem(TOKENS_VISIBLE)
      const verifiedTokensOnly = tokenVibility === null ? true : tokenVibility === 'true'
      this.setState({verifiedTokensOnly})
    } catch (error) {
      this.setState({ verifiedTokensOnly: false })
    }
  }
   _loadFixedTokens = async () => {
     try {
       const fixedTokens = await getFixedTokens()
       this.setState({fixedTokens})
     } catch (error) {
       this.setState({fixedTokens: ['TRX', 'TWX']})
       logSentry(error, 'App - Load Fixed Tokens')
     }
   }

  _loadCurrency = async () => {
    try {
      const preferedCurrency = await AsyncStorage.getItem(USER_PREFERRED_CURRENCY) || 'TRX'
      this._getPrice(preferedCurrency)
      this.setState({ currency: preferedCurrency })
    } catch (error) {
      this.setState({currency: 'TRX'})
      logSentry(error, 'App - Load Fixed Tokens')
    }
  }
  _setNodes = async () => {
    try {
      await NodesIp.initNodes()
    } catch (e) {
      logSentry(e, 'App - SetNodes')
    }
  }

  _updateSystemStatus = async () => {
    try {
      const systemStatus = await getSystemStatus()
      this.setState({systemStatus})
    } catch (error) {
      this.setState({systemStatus: { showStatus: false, statusMessage: '', statusColor: '', messageColor: '' }})
      logSentry(error, 'App - can\'t get system status')
    }
  }

  _setSecretMode = mode => this.setState({ secretMode: mode })

  _setPublicKey = publicKey => this.setState({ publicKey })

  _setAskPin = (alwaysAskPin) => this.setState({ alwaysAskPin })

  _setUseBiometry = (useBiometry) => this.setState({ useBiometry })

  _setVerifiedTokensOnly = (verifiedTokensOnly) => this.setState({ verifiedTokensOnly })

  _setPin = (pin, callback) => {
    this.setState({ pin }, () => {
      this._loadUserData()
      callback()
    })
  }

  _resetAccounts = () => this.setState({accounts: [], publicKey: null})

  _hideAccount = address => {
    const newAccounts = this.state.accounts.filter(acc => acc.address !== address)
    this.setState({accounts: newAccounts})
  }

  render () {
    const contextProps = {
      ...this.state,
      loadUserData: this._loadUserData,
      getPrice: this._getPrice,
      setPublicKey: this._setPublicKey,
      setPin: this._setPin,
      setCurrency: this._setCurrency,
      resetAccount: this._resetAccounts,
      hideAccount: this._hideAccount,
      setAskPin: this._setAskPin,
      setUseBiometry: this._setUseBiometry,
      setSecretMode: this._setSecretMode,
      setVerifiedTokensOnly: this._setVerifiedTokensOnly,
      updateSystemStatus: this._updateSystemStatus
    }

    return (
      <SafeAreaView style={{ backgroundColor: Colors.background, flex: 1 }} >
        <Context.Provider value={contextProps}>
          <StatusBar barStyle='light-content' />
          {this.state.systemStatus.showStatus &&
          <StatusMessage systemStatus={this.state.systemStatus} />}
          <RootNavigator uriPrefix={prefix} />
        </Context.Provider>
      </SafeAreaView>
    )
  }
}

export default App
