let _viewer
const parameter = "Assembly Code"

// Función auxiliar para obtener datos del backend Express/MongoDB
const getData = async (url) => {
  const resp = await fetch(url)
  if (resp.status === 404) {
    return null // Devuelve null si no existe la partida
  }
  if (!resp.ok) {
    throw new Error(await resp.text())
  }
  return await resp.json()
}

const getLeafNodesAsync = () => {
  return new Promise((resolve) => {
    _viewer.model.getObjectTree((tree) => {
      let leaves = []
      tree.enumNodeChildren(
        tree.getRootId(),
        (dbId) => {
          if (tree.getChildCount(dbId) === 0) {
            leaves.push(dbId)
          }
        },
        true
      )
      resolve(leaves)
    })
  })
}

const getItemsAsync = async () => {
  const dbIds = await getLeafNodesAsync()
  return new Promise((resolve, reject) => {
    _viewer.model.getBulkProperties(dbIds, [parameter], instances => {
      let items = new Set()
      for (const instance of instances) {
        if (instance.properties && instance.properties.length > 0) {
          const prop = instance.properties.find(p => p.displayName === parameter)
          if (prop && prop.displayValue) {
            items.add(prop.displayValue)
          }
        }
      }
      resolve(items)
    }, err => reject(err))
  })
}

const getDbIdsFromItemAsync = async (itemId) => {
  const dbIds = await getLeafNodesAsync()
  return new Promise((resolve, reject) => {
    _viewer.model.getBulkProperties(dbIds, [parameter], res => {
      let resultDbIds = []
      for (const item of res) {
        if (item.properties && item.properties.length > 0) {
          const prop = item.properties.find(p => p.displayName === parameter)
          if (prop && prop.displayValue === itemId) {
            resultDbIds.push(item.dbId)
          }
        }
      }
      resolve(resultDbIds)
    }, err => reject(err))
  })
}

const getGroupItemsAsync = async () => {
  const items = await getItemsAsync()
  let groupItems = new Set()
  for (const item of items) {
    groupItems.add(item.charAt(0))
  }
  return Array.from(groupItems).filter(x => x !== '').sort()
}

const getQuantityFromItemAsync = async (dbIds, parameter) => {
  return new Promise((resolve, reject) => {
    _viewer.model.getBulkProperties(dbIds, [parameter], res => {
      let quantity = 0.0
      for (const item of res) {
        quantity += item.properties[0].displayValue
      }
      resolve(quantity)
    }, err => reject(err))
  })
}

const getCapitulos = async () => {
  const groupItems = await getGroupItemsAsync() 
  return groupItems.map((gi) => {
    return {
      type: 'capitulo',
      id: gi,
      text: `Capitulo ${gi}`,
      children: true,
    }
  })
}

const getPartidas = async (id) => {
  const rawItems = await getItemsAsync()
  const items = Array.from(rawItems).filter((x) => x.startsWith(id))

  return items.map((item) => {
    return {
      type: 'partida',
      id: item,
      text: item,
    }
  })
}

const getTotalAmountAsync = async () => {
  // 1) Llamar al servidor para que me devuelva todas las partidas mediante fetch
  const res = await fetch('/api/items')
  const json = await res.json()
  const items = json.data

  // 2) Hacer un foreach o for para recorrer todas las partidas
  let totalAmount = 0.0
  for (const item of items) {
    // 3) Calcular el quantity de la partida y sumarlo en una variable
    const dbIds = await getDbIdsFromItemAsync(item.code)
    const quantity =
      item.parameter === 'Count'
        ? dbIds.length
        : await getQuantityFromItemAsync(dbIds, item.parameter)
    totalAmount += quantity * item.price
  }

  // 4) Escribir el sumatorio total, primero en consola y luego en un div dentro de mi sidebar
  const totalAmountHtml = document.getElementById('totalAmount')
  totalAmountHtml.textContent = `${totalAmount.toFixed(2)} €`
}

export const initTreeBoq = (selector, viewer) => {
  _viewer = viewer
  getTotalAmountAsync()
  const tree = new InspireTree({
    data: (node) => {
      if (!node) {
        return getCapitulos()
      } else {
        return getPartidas(node.id)
      }
    },
  })
  
  tree.on('node.click', async (event, node) => {
  event.preventTreeDefault()
  switch (node.type) {
    case 'capitulo':
      console.log('he clicado en un capitulo')
      break
    case 'partida':
      const dbIds = await getDbIdsFromItemAsync(node.id)
      const data = await getData(`/api/items/${node.id}`)
      if (data) {
      const quantity =
        data.parameter === 'Count'
          ? dbIds.length
          : await getQuantityFromItemAsync(dbIds, data.parameter)
          
            const amount = quantity * data.price
            console.log('amount: ', amount)
          } else {
            console.log('La partida seleccionada no está registrada en la Base de Precios.')
          }
          _viewer.isolate(dbIds)
          _viewer.fitToView(dbIds)
          break
      }
})  
  return new InspireTreeDOM(tree, { target: selector })
}