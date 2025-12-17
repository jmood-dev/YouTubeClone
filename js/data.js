let defaultData = {
  quotaUsage: [],
  cache: {},
  videos: {},
  channels: {}
}

let appData = {}

function addToQuotaUsage(amount) {
  appData.quotaUsage.push({
    amount,
    time: Date.now()
  })
  clearOldQuotaUsage(1000 * 60 * 60 * 24) //clear quota records that are more than a day old
  saveData()
}

function clearOldQuotaUsage(milliseconds) {
  let lastIndexToRemove = -1
  for (let i = 0; i < appData.quotaUsage.length; i++) {
    if (Date.now() - appData.quotaUsage[i].time > milliseconds) {
      lastIndexToRemove = i
    } else {
      break
    }
  }
  if (lastIndexToRemove > -1) {
    appData.quotaUsage = appData.quotaUsage.slice(lastIndexToRemove+1)
  }
  saveData()
}

function setInCache(key, value, type) {
  appData.cache[key] = {value, type, time: Date.now()}
  saveData()
}

function getFromCache(key) {
  return appData.cache[key]
}

function removeFromCache(key) {
  delete appData.cache[key]
  saveData()
}

function loadData() {
  let storedAppDataString = localStorage.getItem("appDataYoutube")
  if (storedAppDataString != null) {
    appData = JSON.parse(storedAppDataString)
  } else {
    appData = JSON.parse(JSON.stringify(defaultData))
  }

  clearOldQuotaUsage(1000 * 60 * 60 * 24) //clear quota that is more than a day old
}

function saveData() {
  localStorage.setItem("appDataYoutube", JSON.stringify(appData))
}
