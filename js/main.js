function searchFromInput() {
  const searchText = document.getElementById('search-text').value
  search(searchText)
}

function search(searchText) {
  if (searchText) {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set("q", searchText)
    if (!window.location.href.split("?")[0].includes("index.html")) {
      window.location.href = "/index.html?" + urlParams
    } else {
      window.history.replaceState(null, null, "/index.html?" + urlParams)
      searchYTVideos()
    }
  }
}

async function searchYTVideos() {

  const urlParams = new URLSearchParams(window.location.search)
  const searchText = urlParams.get('q')
  if (!searchText) {
    return
  }

  addToBadgeSearchTexts(searchText)

  let durParam = urlParams.get("dur")
  let pubParam = urlParams.get("pub")

  let pubAfter = ""
  if (pubParam) {
    if (pubParam == "hour") {
      pubAfter = (new Date(Date.now() - 1000*60*60)).toISOString()
    } else if (pubParam == "today") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      pubAfter = today.toISOString()
    } else if (pubParam == "week") {
      const date = new Date()
      date.setDate(date.getDate() - date.getDay())
      date.setHours(0, 0, 0, 0)
      pubAfter = date.toISOString()
    } else if (pubParam == "month") {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      pubAfter = startOfMonth.toISOString()
    } else if (pubParam == "year") {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      pubAfter = startOfYear.toISOString()
    }
  }

  let urlFilterParams = ""
  if (durParam && pubParam) {
    urlFilterParams = `&videoDuration=${durParam}&publishedAfter=${pubAfter}`
  } else if (durParam) {
    urlFilterParams = `&videoDuration=${durParam}`
  } else if (pubParam) {
    urlFilterParams = `&publishedAfter=${pubAfter}`
  }

  const SEARCH_API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&q=${searchText}&type=video&maxResults=25${urlFilterParams}`

  console.log(SEARCH_API_URL)
  
  let cachedData = getFromCache(SEARCH_API_URL)
  if (cachedData) {
    displaySearchResults(cachedData.value)
    appData.currentSearchResultData = cachedData.value
    renderSearchBadges(searchText)
  } else {
    addToQuotaUsage(100) //it uses 100 quota to make a call to the search API
    try {
      const res = await fetch(SEARCH_API_URL)
      const data = await res.json()
      console.log(data)
      setInCache(SEARCH_API_URL, data, 'search')
      displaySearchResults(data)
      appData.currentSearchResultData = data
      renderSearchBadges(searchText)
    } catch(error) {
      console.log(error)
    }
  }

  renderQuota()
}

function displaySearchResults(data) {
  let sorted = data.items
  if (appData.sortToApply.includes("date")) {
    sorted = data.items.toSorted((a, b) => {
      return (new Date(b.snippet.publishedAt)).getTime() - (new Date(a.snippet.publishedAt)).getTime()
    })
  } else if (appData.sortToApply.includes("title")) {
    sorted = data.items.toSorted((a, b) => {
      return a.snippet.title.localeCompare(b.snippet.title)
    })
  } else if (appData.sortToApply.includes("views")) {
    sorted = data.items.toSorted((a, b) => {
      return appData.videos[b.id.videoId].statistics.viewCount - appData.videos[a.id.videoId].statistics.viewCount
    })
  } else if (appData.sortToApply.includes("likes")) {
    sorted = data.items.toSorted((a, b) => {
      return appData.videos[b.id.videoId].statistics.likeCount - appData.videos[a.id.videoId].statistics.likeCount
    })
  }

  const videosList = document.getElementById("videos-list")
  videosList.replaceChildren()

  sorted.forEach(video => {
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
    getVideo(video.id.videoId, (video) => {
      searchResult.querySelector(".search-result-views").innerText = formatLargeNumber(video.statistics.viewCount) + " views"
      searchResult.querySelector(".duration-overlay").innerText = formatDuration(video.contentDetails.duration)
    })
    getChannel(video.snippet.channelId, (channel) => {
      searchResult.querySelector(".search-result-channel-thumbnail").src = channel.snippet.thumbnails.default.url
    })
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

function formatLargeNumber(num) {
  const NUM_ABBREVIATIONS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Udc', 'Ddc', 'Tdc', 'Qadc', 'Qidc', 'Sxdc', 'Spdc', 'Ocdc', 'Nmdc', 'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ovg', 'Nvg', 'Tg', 'Utg']
  let numLog = Math.floor(Math.log10(num))
  if (numLog < 3) {
    return Math.floor(num)
  } else if (numLog % 3 == 0) {
    return (Math.floor(num/(Math.pow(10, numLog-1)))/10).toFixed(1) + NUM_ABBREVIATIONS[Math.floor(numLog/3)]
  } else if (numLog % 3 == 1) {
    return Math.floor(num/(Math.pow(10, numLog-1))) + NUM_ABBREVIATIONS[Math.floor(numLog/3)]
  } else if (numLog % 3 == 2) {
    return Math.floor(num/(Math.pow(10, numLog-2))) + NUM_ABBREVIATIONS[Math.floor(numLog/3)]
  }
}

function formatWithCommas(num) {
  const options = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  };
  return Number(num).toLocaleString('en-US', options);
}

function formatDuration(duration) {
  let hours = "0"
  let minutes = "0"
  let seconds = "0"
  let nextNum = ""
  for (let i = 0; i < duration.length; i++) {
    if (duration[i] >= "0" && duration[i] <= "9") {
      nextNum += duration[i]
    } else if (duration[i] == "H") {
      hours = nextNum
      nextNum = ""
    } else if (duration[i] == "M") {
      minutes = nextNum
      nextNum = ""
    } else if (duration[i] == "S") {
      seconds = nextNum
      nextNum = ""
    }
  }

  let returnString = ""
  if (Number(hours) == 0) {
    returnString = minutes + ":" + (Number(seconds) < 10 ? "0" : "") + seconds
  } else {
    returnString = hours + ":" + (Number(minutes) < 10 ? "0" : "") + minutes + ":" + (Number(seconds) < 10 ? "0" : "") + seconds
  }

  return returnString
}

function renderSearchBadges(searchText) {
  let badgeList = document.getElementById('cached-searches-badgess')
  badgeList.replaceChildren()

  for (let badgeText of appData.badgeSearchTexts) {
    let badge = document.getElementById("badge-template").content.firstElementChild.cloneNode(true)
    badge.innerText = badgeText
    badge.onclick = () => search(badge.innerText)
    if (searchText == badge.innerText) {
      badge.classList.add('text-bg-light')
      badge.classList.remove('text-bg-dark')
    }
    badgeList.append(badge)
  }
}

function removeActiveSelection(badges) {
  Array.from(badges).forEach(badge => {
    badge.classList.remove('text-bg-light')
    badge.classList.add('text-bg-dark')
  })
}

function addToBadgeSearchTexts(searchText) {
  if (!appData.badgeSearchTexts) {
    appData.badgeSearchTexts = []
  }

  let index = appData.badgeSearchTexts.findIndex(e => e == searchText)
  if (index > -1) {
    appData.badgeSearchTexts.splice(index, 1)
  }
  appData.badgeSearchTexts.unshift(searchText)
  saveData()
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

function initHomePage() {
  appData.currentSearchResultData = {items: []}
  appData.sortToApply = ""

  const urlParams = new URLSearchParams(window.location.search)
  let durParam = urlParams.get("dur")
  let pubParam = urlParams.get("pub")

  let elementsToSelect = []
  if (durParam) {
    elementsToSelect.push(document.querySelector(".guide-item-" + durParam))
  }
  if (pubParam) {
    elementsToSelect.push(document.querySelector(".guide-item-" + pubParam))
  }

  for (let element of elementsToSelect) {
    selectGuideItem(element)
  }
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

  getVideo(videoId, (video) => {
    document.getElementById("main-video-title").innerHTML = video.snippet.title
    document.getElementById("main-video-publish-time").innerText = timeAgoString(new Date(video.snippet.publishedAt))
    document.getElementById("main-video-publish-time").title = (new Date(video.snippet.publishedAt)).toLocaleString()
    document.getElementById("main-video-channel-link").href = "https://www.youtube.com/channel/" + video.snippet.channelId
    document.getElementById("main-video-channel-link-thumbnail").href = "https://www.youtube.com/channel/" + video.snippet.channelId
    document.getElementById("main-video-channel-name").innerText = video.snippet.channelTitle
    document.getElementById("main-video-description").innerText = video.snippet.description
    document.getElementById("main-video-views").innerText = formatLargeNumber(video.statistics.viewCount) + " views"
    document.getElementById("main-video-like-count").innerText = formatLargeNumber(video.statistics.likeCount)
    getChannel(video.snippet.channelId, (channel) => {
      document.getElementById("main-video-channel-thumbnail").src = channel.snippet.thumbnails.default.url
      document.getElementById("main-video-channel-subscriber-count").innerText = formatLargeNumber(channel.statistics.subscriberCount) + " subscribers"
    })
    getCommentThreads(videoId, (commentThreads) => {
      document.getElementById('main-video-comment-count').innerText = formatWithCommas(video.statistics.commentCount) + " Comments"
      let commentList = document.getElementById('main-video-comment-list')
      for (let commentThread of video.commentThreads) {
        let commentDiv = document.getElementById("comment-template").content.firstElementChild.cloneNode(true)
        commentDiv.querySelector(".commenter-thumbnail-link").href = commentThread.snippet.topLevelComment.snippet.authorChannelUrl
        commentDiv.querySelector(".commenter-thumbnail").src = commentThread.snippet.topLevelComment.snippet.authorProfileImageUrl
        commentDiv.querySelector(".commenter-link").href = commentThread.snippet.topLevelComment.snippet.authorChannelUrl
        commentDiv.querySelector(".commenter-display-name").innerText = commentThread.snippet.topLevelComment.snippet.authorDisplayName
        commentDiv.querySelector(".comment-publish-time").innerText = timeAgoString(new Date(commentThread.snippet.topLevelComment.snippet.publishedAt))
        commentDiv.querySelector(".comment-publish-time").title = (new Date(commentThread.snippet.topLevelComment.snippet.publishedAt)).toLocaleString()
        commentDiv.querySelector(".comment-text").innerHTML = commentThread.snippet.topLevelComment.snippet.textDisplay
        commentDiv.querySelector(".comment-like-count").innerText = formatLargeNumber(commentThread.snippet.topLevelComment.snippet.likeCount)
        commentList.append(commentDiv)
      }
    })
  })

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
    getVideo(video.id.videoId, (video) => {
      searchResult.querySelector(".search-result-views").innerText = formatLargeNumber(video.statistics.viewCount) + " views"
      searchResult.querySelector(".duration-overlay").innerText = formatDuration(video.contentDetails.duration)
    })
  })
}

function guideClick(target, action) {
  let selectClicked = true
  if (action == "home") {
    clearGuideSelections(document.getElementById("guide-container"))

    document.getElementById("videos-list").replaceChildren()
    renderSearchBadges("")
    window.history.replaceState(null, null, "/index.html")
    appData.currentSearchResultData = {items: []}
  } else if (action.includes("sort")) {
    clearGuideSelections(document.getElementById("guide-section-home"))
    clearGuideSelections(document.getElementById("guide-section-sort"))

    if (action.includes("relevance")) {
      appData.sortToApply = ""
    } else if (action.includes("date")) {
      appData.sortToApply = "date"
    } else if (action.includes("title")) {
      appData.sortToApply = "title"
    } else if (action.includes("views")) {
      appData.sortToApply = "views"
    } else if (action.includes("likes")) {
      appData.sortToApply = "likes"
    }

    displaySearchResults(appData.currentSearchResultData)
  } else if (action.includes("publish")) {
    clearGuideSelections(document.getElementById("guide-section-home"))
    clearGuideSelections(document.getElementById("guide-section-publish-filter"))

    const urlParams = new URLSearchParams(window.location.search)
    if (action.includes("hour") && urlParams.get("pub") == "hour" || action.includes("today") && urlParams.get("pub") == "today" || 
          action.includes("week") && urlParams.get("pub") == "week" || action.includes("month") && urlParams.get("pub") == "month" ||  
          action.includes("year") && urlParams.get("pub") == "year") {
      urlParams.delete("pub")
      selectClicked = false
    } else if (action.includes("hour")) {
      urlParams.set("pub", "hour")
    } else if (action.includes("today")) {
      urlParams.set("pub", "today")
    } else if (action.includes("week")) {
      urlParams.set("pub", "week")
    } else if (action.includes("month")) {
      urlParams.set("pub", "month")
    } else if (action.includes("year")) {
      urlParams.set("pub", "year")
    }
    window.history.replaceState(null, null, "/index.html?" + urlParams)
    searchYTVideos()
  } else if (action.includes("duration")) {
    clearGuideSelections(document.getElementById("guide-section-home"))
    clearGuideSelections(document.getElementById("guide-section-duration-filter"))

    const urlParams = new URLSearchParams(window.location.search)
    if (action.includes("long") && urlParams.get("dur") == "long" || action.includes("medium") && urlParams.get("dur") == "medium"
                || action.includes("short") && urlParams.get("dur") == "short" ) {
      urlParams.delete("dur")
      selectClicked = false
    } else if (action.includes("long")) {
      urlParams.set("dur", "long")
    } else if (action.includes("medium")) {
      urlParams.set("dur", "medium")
    } else if (action.includes("short")) {
      urlParams.set("dur", "short")
    }
    window.history.replaceState(null, null, "/index.html?" + urlParams)
    searchYTVideos()
  }

  if (selectClicked) {
    selectGuideItem(target)
  }
}

function clearGuideSelections(element) {
  let guideItems = element.querySelectorAll(".guide-item")
  for (let guideItem of guideItems) {
    guideItem.classList.remove("selected")
    let iElement = guideItem.querySelector("i")
    iElement.classList.add(iElement.dataset.classStandard)
    iElement.classList.remove(iElement.dataset.classSelected)
  }
}

function selectGuideItem(element) {
  element.classList.add("selected")
  let iElement = element.querySelector("i")
  iElement.classList.remove(iElement.dataset.classStandard)
  iElement.classList.add(iElement.dataset.classSelected)
}

async function getVideo(id, callback) {
  let video = appData.videos[id]
  if (!video) {
    const VIDEO_API_URL = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&part=snippet%2CcontentDetails%2Cstatistics&id=${id}`
    let cachedItem = getFromCache(VIDEO_API_URL)
    if (cachedItem) {
      video = cachedItem.value.items[0]
      appData.videos[id] = video
      saveData()
    } else {
      addToQuotaUsage(1) //it uses 1 quota to make a call to the video API
      try {
        const res = await fetch(VIDEO_API_URL)
        const data = await res.json()
        console.log(data)
        video = data.items[0]
        appData.videos[id] = data.items[0]
        setInCache(VIDEO_API_URL, data, 'video')
      } catch(error) {
        console.log(error)
      }
    }
  }

  if (callback) {
    callback(video)
  }

  return video
}

async function getChannel(id, callback) {
  let channel = appData.channels[id]
  if (!channel) {
    const CHANNEL_API_URL = `https://www.googleapis.com/youtube/v3/channels?key=${API_KEY}&part=snippet%2CcontentDetails%2Cstatistics&id=${id}`
    let cachedItem = getFromCache(CHANNEL_API_URL)
    if (cachedItem) {
      channel = cachedItem.value.items[0]
      appData.channels[id] = channel
      saveData()
    } else {
      addToQuotaUsage(1) //it uses 1 quota to make a call to the channel API
      try {
        const res = await fetch(CHANNEL_API_URL)
        const data = await res.json()
        console.log(data)
        channel = data.items[0]
        appData.channels[id] = data.items[0]
        setInCache(CHANNEL_API_URL, data, 'channel')
      } catch(error) {
        console.log(error)
      }
    }
  }

  if (callback) {
    callback(channel)
  }

  return channel
}

async function getCommentThreads(videoId, callback) {
  let commentThreads = appData.videos[videoId].commentThreads
  if (!commentThreads) {
    const COMMENT_THREADS_API_URL = `https://www.googleapis.com/youtube/v3/commentThreads?key=${API_KEY}&part=snippet%2Creplies&videoId=${videoId}`
    let cachedItem = getFromCache(COMMENT_THREADS_API_URL)
    if (cachedItem) {
      commentThreads = cachedItem.value.items
      appData.video[videoId].commentThreads = commentThreads
      saveData()
    } else {
      addToQuotaUsage(1) //it uses 1 quota to make a call to the comment threads API
      try {
        const res = await fetch(COMMENT_THREADS_API_URL)
        const data = await res.json()
        console.log(data)
        commentThreads = data.items
        appData.videos[videoId].commentThreads = data.items
        setInCache(COMMENT_THREADS_API_URL, data, 'commentThreads')
      } catch(error) {
        console.log(error)
      }
    }
  }

  if (callback) {
    callback(commentThreads)
  }

  return commentThreads
}
