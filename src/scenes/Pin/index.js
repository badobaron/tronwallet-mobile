import React from 'react'
import { BackHandler, TouchableOpacity, AsyncStorage, Alert } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Biometrics from 'react-native-biometrics'
import * as Animatable from 'react-native-animatable'

import tl from '../../utils/i18n'
import { decrypt } from '../../utils/encrypt'
import * as Utils from '../../components/Utils'
import * as Elements from './elements'
import { Colors } from '../../components/DesignSystem'
import { USE_BIOMETRY, ENCRYPTED_PIN } from '../../utils/constants'

class PinScene extends React.Component {
  state = {
    isDoubleChecking: false,
    pin: '',
    checkPin: '',
    biometricsEnabled: false
  }

  componentDidMount () {
    Biometrics.isSensorAvailable()
      .then(async (biometryType) => {
        const useBiometrySetting = await AsyncStorage.getItem(USE_BIOMETRY)

        const useBiometry = useBiometrySetting === null ? false : useBiometrySetting === 'true'
        if ((biometryType === Biometrics.TouchID || biometryType === Biometrics.FaceID) && useBiometry) {
          this.setState({ biometricsEnabled: true })
        }
      })

    this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const shouldGoBack = this.props.navigation.getParam('shouldGoBack', false)
      if (shouldGoBack) {
        this.props.navigation.goBack()
      }
      return true
    })
  }

  componenDidUpdate(preveProps, prevState) {
    if (!prevState.biometricsEnabled && this.state.biometricsEnabled) {
      this._handleBiometrics()
    }
  }

  componentWillUnmount () {
    this.backHandler.remove()
  }

  _resetState = () => {
    this.setState({
      isDoubleChecking: false,
      pin: this.state.pin,
      checkPin: ''
    })
  }

  _handleKeyInput = digit => {
    if (this.state.isDoubleChecking) {
      if (this.state.checkPin.length < 6) {
        this.setState({ checkPin: `${this.state.checkPin}${digit}` }, this._checkInput)
      }
    } else {
      if (this.state.pin.length < 6) {
        this.setState({ pin: `${this.state.pin}${digit}` }, this._checkInput)
      }
    }
  }

  _doubleCheckPin = () => {
    this.setState({ isDoubleChecking: true })
  }

  _checkInput = async () => {
    const testInput = this.props.navigation.getParam('testInput')
    const onSuccess = this.props.navigation.getParam('onSuccess')
    const shouldDoubleCheck = this.props.navigation.getParam('shouldDoubleCheck', false)
    const completeAndNoDoubleCheck = (this.state.pin.length === 6) && !shouldDoubleCheck
    const completeAndDoubleCheck = (this.state.checkPin.length === 6)
    if (shouldDoubleCheck && !this.state.isDoubleChecking && (this.state.pin.length === 6)) {
      this._doubleCheckPin()
    }
    if (completeAndNoDoubleCheck || completeAndDoubleCheck) {
      if (this.state.isDoubleChecking && (this.state.pin === this.state.checkPin)) {
        this.props.navigation.goBack()
        return onSuccess(this.state.pin)
      }
      if (!shouldDoubleCheck) {
        const result = await testInput(this.state.pin)
        if (result) {
          this.props.navigation.goBack()
          if (onSuccess) return onSuccess(this.state.pin)
        }
      }
      this.pinView.shake(200)
      this._handleClear()
    }
  }

  _handleDelete = () => {
    if (this.state.isDoubleChecking) {
      this.setState({ checkPin: this.state.checkPin.substring(0, this.state.checkPin.length - 1) })
    } else {
      this.setState({ pin: this.state.pin.substring(0, this.state.pin.length - 1) })
    }
  }

  _handleClear = () => {
    if (this.state.isDoubleChecking) {
      this.setState({ checkPin: '' })
    } else {
      this.setState({ pin: '' })
    }
  }

  _handleBiometrics = async () => {
    try {
      const signature = await Biometrics.createSignature(tl.t('biometry.register.title'), '')
      const pin = decrypt(await AsyncStorage.getItem(ENCRYPTED_PIN), signature)

      this.setState({ pin, checkPin: pin })
      this._checkInput()
    } catch (error) {
      Alert.alert(tl.t('biometry.auth.error'))
    }
  }

  _renderBiometrics = () => {
    const { biometricsEnabled } = this.state

    if (biometricsEnabled) {
      return (
        <Utils.View flex={0.4} justify='center' align='center'>
          <TouchableOpacity onPress={this._handleBiometrics}>
            <Elements.Text>{tl.t('pin.biometrics')}</Elements.Text>
          </TouchableOpacity>
        </Utils.View>
      )
    }

    return null
  }

  _renderTitle = () => {
    const { isDoubleChecking } = this.state
    const shouldDoubleCheck = this.props.navigation.getParam('shouldDoubleCheck', false)

    if (isDoubleChecking) {
      return tl.t('pin.reenter')
    } else if (shouldDoubleCheck) {
      return tl.t('pin.new')
    }

    return tl.t('pin.enter')
  }

  render () {
    const shouldGoBack = this.props.navigation.getParam('shouldGoBack', false)
    return (
      <Utils.Container>
        <Utils.Content>
          {this.state.isDoubleChecking && <Elements.GoBackButton onPress={this._resetState} />}
          {shouldGoBack && <Elements.GoBackButton onPress={() => this.props.navigation.goBack()} />}
          <Utils.View align='center'>
            <Elements.Label>{tl.t('pin.title')}</Elements.Label>
            <Utils.VerticalSpacer />
            <Elements.Text>{this._renderTitle()}</Elements.Text>
          </Utils.View>
        </Utils.Content>
        <Utils.View flex={1} justify='center' align='center'>
          <Animatable.View ref={ref => { this.pinView = ref }}>
            <Utils.Row align='center' justify='space-between' width={264}>
              <Elements.PinDigit
                digit={0}
                currentState={this.state.isDoubleChecking ? this.state.checkPin : this.state.pin}
              />
              <Elements.PinDigit
                digit={1}
                currentState={this.state.isDoubleChecking ? this.state.checkPin : this.state.pin}
              />
              <Elements.PinDigit
                digit={2}
                currentState={this.state.isDoubleChecking ? this.state.checkPin : this.state.pin}
              />
              <Elements.PinDigit
                digit={3}
                currentState={this.state.isDoubleChecking ? this.state.checkPin : this.state.pin}
              />
              <Elements.PinDigit
                digit={4}
                currentState={this.state.isDoubleChecking ? this.state.checkPin : this.state.pin}
              />
              <Elements.PinDigit
                digit={5}
                currentState={this.state.isDoubleChecking ? this.state.checkPin : this.state.pin}
              />
            </Utils.Row>
          </Animatable.View>
        </Utils.View>

        <Elements.KeyPad>
          <Elements.Key onPress={() => this._handleKeyInput(1)}>1</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(2)}>2</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(3)}>3</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(4)}>4</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(5)}>5</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(6)}>6</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(7)}>7</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(8)}>8</Elements.Key>
          <Elements.Key onPress={() => this._handleKeyInput(9)}>9</Elements.Key>
          <Elements.Key disabled noBorder />
          <Elements.Key onPress={() => this._handleKeyInput(0)}>0</Elements.Key>
          <Elements.Key
            onPress={this._handleDelete}
            onLongPress={this._handleClear}
          >
            <Ionicons name='ios-backspace' size={24} color={Colors.secondaryText} />
          </Elements.Key>
        </Elements.KeyPad>

        {this._renderBiometrics()}
      </Utils.Container>
    )
  }
}

export default PinScene
