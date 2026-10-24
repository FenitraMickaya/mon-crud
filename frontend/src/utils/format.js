const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const integer = new Intl.NumberFormat('fr-FR')

export const formatEuro = (value) => euro.format(Number(value) || 0)
export const formatInteger = (value) => integer.format(Number(value) || 0)
