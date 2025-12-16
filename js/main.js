async function searchYTVideos() {

  const searchText = document.getElementById('search-text').value
  const API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&q=${searchText}&type=video&maxResults=25&videoDuration=long`

  console.log(API_URL)

  addToQuotaUsage(100) //it uses 100 quota to make a call to the search API
  renderQuota()
  try {
    const res = await fetch(API_URL)
    const data = await res.json()
    console.log(data)
    displayVideos(data)
  } catch(error) {
    console.log(error)
  }
}

function displayVideos(data) {
  const videosList = document.getElementById("videos-list")
  videosList.innerHTML = ''

  data.items.forEach( video => {
    const colDiv = document.createElement('div')
    colDiv.classList.add("col-xl-4", "col-lg-6", "col-md-12", "text-center")

    const iframe = document.createElement('iframe')
    iframe.width = 400
    iframe.height = 225
    const { videoId } = video.id
    iframe.src = `https://www.youtube.com/embed/${videoId}`
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    iframe.setAttribute('allowfullscreen', 'true')

    colDiv.append(iframe)
    videosList.append(colDiv)
  })
}

const badges = document.getElementsByClassName('badge')
Array.from(badges).forEach(badge => {
  badge.addEventListener('click', event => {

    removeActiveSelection()
    badge.classList.add('text-bg-light')
    badge.classList.remove('text-bg-dark')

    console.log(badge.innerText)
    document.getElementById('search-text').value = badge.innerText

    //searchYTVideos()
  })
  
})

function removeActiveSelection() {
  Array.from(badges).forEach(badge => {
    badge.classList.remove('text-bg-light')
    badge.classList.add('text-bg-dark')
  })
}

function renderQuota() {
  let quotaUsed = 0
  for (let item of appData.quotaUsage) {
    quotaUsed += item.amount
  }
  
  let degrees = Math.floor(360*quotaUsed/10000)
  let color = degrees < 180 ? 'green' : degrees < 270 ? 'yellow' : 'red'
  document.getElementById('quota-chart').style.backgroundImage = `conic-gradient(${color} 0deg, ${color} ${degrees}deg, transparent ${degrees}deg, transparent 360deg)`
  document.getElementById('quota-chart').title = `Quota used: ${quotaUsed} of 10000`
}


loadData()
renderQuota()
