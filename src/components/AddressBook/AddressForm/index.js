import React, { Component } from 'react'
import { Keyboard, TouchableWithoutFeedback, Clipboard } from 'react-native'
import PropTypes from 'prop-types'

import { FormGroup, CancelWrapper, ErrorText } from './elements'
import IconButton from '../../../components/IconButton'
import { VerticalSpacer, Container, Content } from '../../../components/Utils'
import Input from '../../../components/Input'
import ButtonGradient from '../../../components/ButtonGradient'
import CancelButton from '../../../components/CancelButton'

import { isAddressValid } from '../../../services/address'
import { ADD, EDIT } from '../../../utils/constants'
import { isNameValid, isAddressUnique } from '../../../utils/validations'
import getContactStore from '../../../store/contacts'

export default class ContactsForm extends Component {
  static propTypes = {
    name: PropTypes.string,
    address: PropTypes.string,
    navigation: PropTypes.object.isRequired
  }

  state = {
    name: this.props.name || '',
    address: this.props.address || '',
    initialAddress: this.props.address,
    nameError: null,
    addressError: null,
    generalError: null
  }

  _nextInput = input => {
    if (input === 'address') {
      this.address.focus()
      return
    }

    if (input === 'submit') {
      Keyboard.dismiss()
    }
  }

  _generalError = (generalError) => {
    this.setState({
      generalError
    })
  }

  _onSubmit = async (contact) => {
    const store = await getContactStore()
    try {
      await store.write(() => { store.create('Contact', contact, true) })
      this.props.navigation.goBack()
    } catch (e) {
      // this._generalError(e)
      console.log(e)
    }
  }

  _changeName = (name) => {
    this._changeState(name, 'name', isNameValid, 'The name field must start with a letter and it will accept only letters, numbers and white spaces.')
  }

  _changeAddress = (address) => {
    this._changeState(address.trim(), 'address', isAddressValid, 'Something isn\'t right with the address. Please double check for typos.')
  }

  _validateState = async (item, type, validation, error) => {
    const stateObj = {
      [type]: item,
      [`${type}Error`]: null
    }

    if (!item.length) return stateObj

    if (this.props.type === ADD && type === 'address') {
      const addressIsUnique = await isAddressUnique(item)

      if (!addressIsUnique) {
        return {
          ...stateObj,
          [`${type}Error`]: 'The key must be unique. Please choose a different address.'
        }
      }
    }

    if (!validation(item)) {
      return {
        ...stateObj,
        [`${type}Error`]: error
      }
    }

    return stateObj
  }

  _changeState = async (prop, type, validation, error) => {
    const stateObj = await this._validateState(prop, type, validation, error)
    this.setState({...stateObj})
  }

  _submitDisabled = () => {
    const { name, address, generalError, nameError, addressError } = this.state

    if (!name.length || !address.length) {
      return true
    } else if (!!generalError || !!nameError || !!addressError) {
      return true
    }

    return false
  }

  _onPaste = async () => {
    const address = await Clipboard.getString()
    if (address) {
      this._changeAddress(address)
      this._nextInput('submit')
    }
  }

  _rightContentTo = () => this.props.type === ADD ? <IconButton onPress={this._onPaste} icon='md-clipboard' /> : null

  render () {
    const { name, address, nameError, addressError } = this.state
    const { type } = this.props

    return (
      <Container>
        <Content>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FormGroup>
              <Input
                innerRef={(input) => { this.name = input }}
                label='NAME'
                value={name}
                onChangeText={name => this._changeName(name)}
                onSubmitEditing={() => this._nextInput('address')}
              />
              {nameError && (
                <React.Fragment>
                  <ErrorText>
                    {nameError}
                  </ErrorText>
                </React.Fragment>
              )}
              <Input
                innerRef={(input) => { this.address = input }}
                label='ADDRESS'
                value={address}
                rightContent={this._rightContentTo}
                onChangeText={address => this._changeAddress(address)}
                onSubmitEditing={() => this._nextInput('submit')}
                style={{fontSize: 14}}
                editable={type !== EDIT}
              />
              {addressError && (
                <React.Fragment>
                  <ErrorText>
                    {addressError}
                  </ErrorText>
                </React.Fragment>
              )}
              <VerticalSpacer size='medium' />
              <ButtonGradient
                text={type}
                onPress={() => this._onSubmit({
                  name: name.trim(),
                  alias: `@${name.trim().toLowerCase().replace(' ', '_')}`,
                  address
                })}
                disabled={this._submitDisabled()}
              />
              <CancelWrapper>
                <CancelButton navigation={this.props.navigation} />
              </CancelWrapper>
            </FormGroup>
          </TouchableWithoutFeedback>
        </Content>
      </Container>
    )
  }
}
