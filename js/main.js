async function searchYTVideos() {

  const searchText = document.getElementById('search-text').value
  const API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&q=${searchText}&type=video&maxResults=25&videoDuration=long`

  console.log(API_URL)
  
  let cachedData = getFromCache(API_URL)
  if (cachedData) {
    displaySearchResults(cachedData.value)
  } else {
    addToQuotaUsage(100) //it uses 100 quota to make a call to the search API
    try {
      const res = await fetch(API_URL)
      const data = await res.json()
      console.log(data)
      setInCache(API_URL, data, 'search')
      displaySearchResults(data)
      renderSearchBadges()
    } catch(error) {
      console.log(error)
    }
  }

  renderQuota()
}

function displaySearchResults(data) {
  const videosList = document.getElementById("videos-list")
  videosList.replaceChildren()

  data.items.forEach(video => {
    let searchResult = document.getElementById("search-result-template").content.firstElementChild.cloneNode(true)
    searchResult.querySelector(".thumbnail-link").href = "html/video.html?vid=" + video.id.videoId
    searchResult.querySelector(".thumbnail").src = video.snippet.thumbnails.medium.url
    searchResult.querySelector(".search-result-title").innerHTML = video.snippet.title
    searchResult.querySelector(".search-result-title-link").href = "html/video.html?vid=" + video.id.videoId
    searchResult.querySelector(".search-result-publish-time").innerText = timeAgoString(new Date(video.snippet.publishedAt))
    searchResult.querySelector(".search-result-publish-time").title = (new Date(video.snippet.publishedAt)).toLocaleString()
    searchResult.querySelector(".search-result-channel-link").href = "https://www.youtube.com/channel/" + video.snippet.channelId
    searchResult.querySelector(".search-result-channel-name").innerText = video.snippet.channelTitle
    searchResult.querySelector(".search-result-description").innerText = video.snippet.description
    videosList.append(searchResult)
  })
}

function timeAgoString(date) {
  let timeElapsed = Date.now() - date.getTime()
  if (timeElapsed > 1000 * 60 * 60 * 24 * 365.2425) {
    let count = Math.floor(timeElapsed / (1000 * 60 * 60 * 24 * 365.2425))
    return count + (count == 1 ? " year ago" : " years ago")
  } else if (timeElapsed > 1000 * 60 * 60 * 24 * 30.436875) {
    let count = Math.floor(timeElapsed / (1000 * 60 * 60 * 24 * 30.436875))
    return count + (count == 1 ? " month ago" : " months ago")
  } else  if (timeElapsed > 1000 * 60 * 60 * 24) {
    let count = Math.floor(timeElapsed / (1000 * 60 * 60 * 24))
    return count + (count == 1 ? " day ago" : " days ago")
  } else  if (timeElapsed > 1000 * 60 * 60) {
    let count = Math.floor(timeElapsed / (1000 * 60 * 60))
    return count + (count == 1 ? " hour ago" : " hours ago")
  } else  if (timeElapsed > 1000 * 60) {
    let count = Math.floor(timeElapsed / (1000 * 60))
    return count + (count == 1 ? " minute ago" : " minutes ago")
  } else  if (timeElapsed > 1000) {
    let count = Math.floor(timeElapsed / 1000)
    return count + (count == 1 ? " second ago" : " seconds ago")
  }
  return "Just now"
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

function renderSearchBadges() {
  let badgeList = document.getElementById('cached-searches-badgess')
  badgeList.replaceChildren()
  for (let key in appData.cache) {
    let cachedItem = getFromCache(key)
    if (cachedItem.type == "search") {
      let badge = document.getElementById("badge-template").content.firstElementChild.cloneNode(true)
      badge.innerText = key.split("&q=")[1].split("&")[0]

      badge.onclick = () => {
        removeActiveSelection(badgeList.children)
        badge.classList.add('text-bg-light')
        badge.classList.remove('text-bg-dark')

        console.log(badge.innerText)
        document.getElementById('search-text').value = badge.innerText

        searchYTVideos()
      }

      badgeList.append(badge)
    }
  }
}

function removeActiveSelection(badges) {
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

function initVideoPage() {
  renderVideoPage()
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      console.log(entry)
      let videoIframe = entry.target
      let newHeight = entry.contentRect.width * 9 / 16
      if (Math.abs(videoIframe.height - newHeight) > 1) {
        videoIframe.height = newHeight
      }
    }
  })
  resizeObserver.observe(document.getElementById('main-video'))
}

function renderVideoPage() {
  let videoId = (new URLSearchParams(window.location.search)).get('vid')
  document.getElementById('main-video').src = "https://www.youtube.com/embed/" + videoId

  let allVideos = []
  for (let key in appData.cache) {
    if (appData.cache[key].type == 'search') {
      appData.cache[key].value.items.forEach(e => allVideos.push(e))
    }
  }

  let video = allVideos.find(v => v.id.videoId == videoId)

  document.getElementById("main-video-title").innerHTML = video.snippet.title
  document.getElementById("main-video-publish-time").innerText = timeAgoString(new Date(video.snippet.publishedAt))
  document.getElementById("main-video-publish-time").title = (new Date(video.snippet.publishedAt)).toLocaleString()
  document.getElementById("main-video-channel-link").href = "https://www.youtube.com/channel/" + video.snippet.channelId
  document.getElementById("main-video-channel-name").innerText = video.snippet.channelTitle
  document.getElementById("main-video-description").innerText = video.snippet.description

  let sidebarVideos = []
  while (sidebarVideos.length < 25 && allVideos.length > 0) {
    sidebarVideos.push(allVideos.splice(Math.floor(Math.random() * allVideos.length), 1)[0])
  }

  const videosList = document.getElementById("sidebar")
  videosList.replaceChildren()

  sidebarVideos.forEach(video => {
    let searchResult = document.getElementById("search-result-sidebar-template").content.firstElementChild.cloneNode(true)
    searchResult.querySelector(".thumbnail-link").href = "video.html?vid=" + video.id.videoId
    searchResult.querySelector(".thumbnail").src = video.snippet.thumbnails.medium.url
    searchResult.querySelector(".search-result-title").innerHTML = video.snippet.title
    searchResult.querySelector(".search-result-title-link").href = "video.html?vid=" + video.id.videoId
    searchResult.querySelector(".search-result-publish-time").innerText = timeAgoString(new Date(video.snippet.publishedAt))
    searchResult.querySelector(".search-result-publish-time").title = (new Date(video.snippet.publishedAt)).toLocaleString()
    searchResult.querySelector(".search-result-channel-link").href = "https://www.youtube.com/channel/" + video.snippet.channelId
    searchResult.querySelector(".search-result-channel-name").innerText = video.snippet.channelTitle
    videosList.append(searchResult)
  })
}

