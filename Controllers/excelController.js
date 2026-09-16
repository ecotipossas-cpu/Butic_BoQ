const ExcelJS = require('exceljs')
const Item = require('../models/Item')

const createExcel = async (req, res, next) => {
  try {
    const { nombreLibro, nombreHoja } = req.body

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(nombreHoja)

    sheet.columns = [
      { header: 'Naturaleza', key: 'nat', width: 20 },
      { header: 'Codigo', key: 'cod', width: 10 },
      { header: 'Nombre', key: 'name', width: 15 },
      { header: 'Unidad', key: 'unit', width: 15 },
      { header: 'Precio', key: 'price', width: 15 },
      { header: 'Cantidad', key: 'quantity', width: 15 },
      { header: 'Importe', key: 'amount', width: 15 },
    ]

    for (const capitulo of req.body.data) {
      sheet.addRow(capitulo)
      for (const partida of capitulo.partidas) {
        const item = await Item.findOne({ code: partida.cod })
        if (item) {
          const { name, unit, price } = item
          sheet.addRow({
            ...partida,
            name,
            unit,
            price,
            amount: (partida.quantity * price).toFixed(2),
          })
        }
      }
    }

    // Configurar encabezados HTTP para forzar la descarga del archivo binario
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreLibro}.xlsx"`
    )

    // Escribir el libro de Excel directamente sobre la respuesta Express
    await workbook.xlsx.write(res)
    res.status(200).end()
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createExcel,
}