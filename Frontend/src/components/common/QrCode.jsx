const QrCode = ({ value = 'EVENT-MANAGER', label = 'Code QR' }) => {
  const hash = [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7)
  const cells = Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9)
    const col = index % 9
    const inFinder =
      (row < 3 && col < 3) ||
      (row < 3 && col > 5) ||
      (row > 5 && col < 3)
    if (inFinder) {
      return row === 1 && col === 1 ? false : true
    }
    return (index * 37 + hash + row * 11 + col * 7) % 3 !== 0
  })

  return (
    <div className="qr-code" role="img" aria-label={label} title={value}>
      {cells.map((on, index) => (
        <span key={index} className={on ? 'is-on' : ''} />
      ))}
    </div>
  )
}

export default QrCode
