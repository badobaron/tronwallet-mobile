import axios from 'axios'
import Config from 'react-native-config'
import NodesIp from '../utils/nodeIp'
import { AUTH_ID } from '../../config'

export const ONE_TRX = 1000000

class ClientWallet {
  constructor (opt = null) {
    this.api = Config.MAIN_API_URL
    this.apiTest = Config.API_URL
    this.notifier = Config.NOTIFIER_API_URL
    this.tronwalletApi = Config.TRONWALLET_API
    this.tronwalletDB = Config.TRONWALLET_DB
  }

  //* ============TronScan Api============*//

  async getTronscanUrl () {
    const { isTestnet } = await NodesIp.getAllNodesIp()
    return isTestnet ? this.apiTest : this.api
  }

  async getTokenList (start, limit, name) {
    const apiUrl = await this.getTronscanUrl()
    const { data: { data } } = await axios.get(
      `${apiUrl}/token?sort=-name&start=${start}&limit=${limit}&name=%25${name}%25&status=ico`
    )
    return data
  }

  //* ============TronWalletServerless Api============*//

  async getAccountData (address) {
    const apiUrl = this.tronwalletApi
    const { data: { balance, balances, frozen, bandwidth } } = await axios.get(`${apiUrl}/account/${address}`)

    const balancesData = balances.sort((a, b) => Number(b.balance) - Number(a.balance))
    const freezeData = { ...frozen, total: frozen.total / ONE_TRX, bandwidth }
    return { address, balancesData, freezeData, balanceTotal: balance / ONE_TRX }
  }

  async getBalances (address) {
    const apiUrl = this.tronwalletApi
    const { data: { balances } } = await axios.get(
      `${apiUrl}/account/${address}`
    )
    if (balances && balances.length > 1) {
      return balances.sort((a, b) => Number(b.balance) - Number(a.balance))
    }
    return balances
  }

  async getFreeze (address) {
    const { data: { frozen, bandwidth, balances } } = await axios.get(
      `${this.tronwalletApi}/account/${address}`
    )
    return { ...frozen, total: frozen.total / ONE_TRX, bandwidth, balances }
  }

  async giftUser (address, deviceId) {
    const body = { address, deviceId, authid: AUTH_ID }
    const { data: { result } } = await axios.post(`${this.tronwalletApi}/gift`, body)
    return result
  }

  async getTransactionsList (address) {
    const reqBody = { '$or': [{ 'toAddress': address }, { 'ownerAddress': address }] }
    const { data: result } = await axios.post(`${this.tronwalletDB}/transactions/find`, reqBody)
    return result.map(tx =>
      tx.contractType <= 2
        ? {...tx, contractType: 1, type: 'Transfer'}
        : {...tx, type: this.getContractType(tx.contractType)})
  }

  async getTransactionByHash (hash, address) {
    const reqBody = { hash }
    const { data: result } = await axios.post(`${this.tronwalletDB}/transactions/find/`, reqBody)

    if (result.length) {
      const transactionDetail = result[0]
      return transactionDetail.contractType <= 2
        ? {...transactionDetail, contractType: 1, type: 'Transfer', confirmed: true}
        : {...transactionDetail, type: this.getContractType(transactionDetail.contractType), confirmed: true}
    } else {
      return { confirmed: false }
    }
  }

  async getAssetList () {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const { data } = await axios.get(
      `${this.tronwalletApi}/vote/list?node=${nodeIp}`
    )
    return data
  }

  async getWitnessesList () {
    const apiUrl = this.tronwalletApi
    const { data: { totalVotes, voteList } } = await axios.get(`${apiUrl}/vote/list`)
    return { voteList, totalVotes }
  }

  async getTransactionDetails (tx) {
    const apiUrl = this.tronwalletApi
    const { data } = await axios.post(`${apiUrl}/transaction/detail`, { transaction: tx })
    return data
  }

  async broadcastTransaction (transactionSigned) {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const reqBody = {
      transactionSigned,
      node: nodeIp
    }
    const { data: { result } } = await axios.post(
      `${this.tronwalletApi}/transaction/broadcast`,
      reqBody
    )
    return result
  }

  async getTransferTransaction ({ to, from, token, amount, data }) {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const reqBody = {
      from,
      to,
      amount,
      token,
      data,
      node: nodeIp
    }
    const { data: { transaction } } = await axios.post(
      `${this.tronwalletApi}/unsigned/send`,
      reqBody
    )
    return transaction
  }

  async getFreezeTransaction (address, freezeAmount) {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const reqBody = {
      address,
      freezeAmount,
      freezeDuration: 3,
      node: nodeIp
    }
    const { data: { transaction } } = await axios.post(
      `${this.tronwalletApi}/unsigned/freeze`,
      reqBody
    )
    return transaction
  }

  async getUnfreezeTransaction (address, pin) {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const reqBody = {
      address,
      node: nodeIp
    }
    const { data: { transaction } } = await axios.post(
      `${this.tronwalletApi}/unsigned/unfreeze`,
      reqBody
    )
    return transaction
  }

  async getParticipateTransaction (address, {
    participateAmount,
    participateToken,
    participateAddress
  }) {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const reqBody = {
      address,
      participateAmount,
      participateToken,
      participateAddress,
      node: nodeIp
    }
    const { data: { transaction } } = await axios.post(
      `${this.tronwalletApi}/unsigned/participate`,
      reqBody
    )
    return transaction
  }

  async getVoteWitnessTransaction (address, votes) {
    const { nodeIp } = await NodesIp.getAllNodesIp()
    const reqBody = {
      address,
      votes,
      node: nodeIp
    }
    const { data: { transaction } } = await axios.post(
      `${this.tronwalletApi}/unsigned/vote`,
      reqBody
    )
    return transaction
  }

  async registerDeviceForNotifications (deviceId, publicKey, removeExtraDeviceIds) {
    return axios.post(`${this.tronwalletApi}/user/put`, { deviceId, publicKey, refresh: removeExtraDeviceIds })
  }

  async notifyNewTransactions (id, transactions) {
    return axios.post(`${this.tronwalletApi}/notify`, { id, transactions })
  }

  async getDevicesFromPublicKey (publicKey) {
    return axios.get(`${this.tronwalletApi}/user/${publicKey}`)
  }

  getContractType = number => {
    switch (number) {
      case 1:
        return 'Transfer'
      case 2:
        return 'Transfer Asset'
      case 4:
        return 'Vote'
      case 6:
        return 'Create'
      case 9:
        return 'Participate'
      case 11:
        return 'Freeze'
      case 12:
        return 'Unfreeze'
      default:
        return 'Unregistred Name'
    }
  }
}

export default new ClientWallet()
