// 每轮洗牌后取完再重新洗牌，避免轮次交界连续出现同一条留言。
export function createMessagePicker(random = Math.random) {
  let bag = []
  let previousId
  let signature = ''
  return messages => {
    const nextSignature = JSON.stringify(messages.map(message => message.id))
    if (nextSignature !== signature) {
      bag = []
      signature = nextSignature
    }
    if (!messages.length) return null
    if (!bag.length) {
      bag = [...messages]
      for (let index = bag.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1))
        ;[bag[index], bag[other]] = [bag[other], bag[index]]
      }
      if (bag.length > 1 && bag[bag.length - 1].id === previousId) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]]
      }
    }
    const message = bag.pop()
    previousId = message.id
    return message
  }
}
