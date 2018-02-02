// see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#Example_usage

// select the target node
var target = document.querySelector("#page-container");

// Run the option callback if the option is set to true in storage
function setupOption(optionID, callback) {
 chrome.storage.local.get(optionID, function (setting) {
   // Assume options that are not yet stored as keys are set to true
   if (Object.keys(setting).length == 0 || setting[optionID]) {
    callback();
   }
 });
}

function makeVideoLink(videoURL) {
 var videoLink = $("<a>");
 videoLink.attr("href", videoURL);
 videoLink.attr("target", "_blank");
 videoLink.text(videoURL);
 return videoLink;
}

optionCallbacks = {
 "with-replies": function () {
  // By default, a user profile filters out tweets
  // that are replies to other tweets.
  // Turn on this option
  // if you would prefer they be included when you follow a link to a profile.
  $("a.twitter-atreply, a.js-action-profile-link, a.js-user-profile-link")
   .not("[href$='/with_replies']").each(function () {
    var href = $(this).attr("href");
    // This is how Twitter codes the URL for the "with replies" option:
    $(this).attr("href", href+"/with_replies");
  });
 },
 "latest-tweets": function () {
  // By default, hashtag and search links go to "top tweets."
  // With this option turned on, we make them go to "latest" instead:
  $(".u-linkComplex").parent().not("[href$='&f=tweets']").each(function () {
    // console.log($(this).get(0).outerHTML);
    $(this).attr("href", $(this).attr("href")+"&f=tweets");
  });
  $("[href*='hashtag']").not("[href$='&f=tweets']").each(function () {
    $(this).attr("href", $(this).attr("href")+"&f=tweets");
  });
 },
 "dismiss-things": function () {
  $("DismissibleModule").remove();
 },
 "autoplaying-media": function () {
  $(".AdaptiveMediaOuterContainer").css("border", "5px solid red");
  // Deal with "periscope"
  $(".card-type-periscope_broadcast").each(function () {
    var videoURL = "https://twitter.com"+$(this).attr("data-src");
    var videoLink = makeVideoLink(videoURL);
    $(this).parent().html(videoLink);
  });
  // Video outside main timeline seems to have no redeeming value,
  // so terminate with extreme prejudice.
  $(".LiveVideoHomePageModule-linkOverlayBox").remove();
  // Treatment for videos embedded in tweets:
  var mediaElement = $(".has-autoplayable-media");
  // Mark tweet as one containing otherwise autoplaying video:
  mediaElement.parent().css("background-color", "#cff");
  // console.log(`mediaElement: ${mediaElement.get(0).outerHTML}`);
  // src attribute of the <iframe> points to a file that contains the video URL
  var iframe = mediaElement.find("iframe");
  if (iframe.length) {
   var src = iframe.attr("src");
   // We must get that file to get the video URL:
   $.get(src, function (data) {
     // Then we must parse that file
     // to get the JSON object that contains the video URL:
     var doc = (new DOMParser()).parseFromString(data, "text/html");
     var configJSON = $("#playerContainer", doc).attr("data-config");
     // TODO: separate procedure for URL's ending in ".m3u8"
     // Seems such links have "/amplify_video/" in URL path,
     // whereas straight up links to actual video files have "/tweet_video/"
     if (typeof configJSON != "undefined") {
      var videoURL = JSON.parse(configJSON).video_url;
     }
     // Now we create a target="_blank" type link
     // in case you are interested in the video:
     var videoLink = makeVideoLink(videoURL);
     mediaElement.html(videoLink);
   });
  }
  $(".PlayableMedia-player").each(function () {
    return undefined;
    // console.log $(this).style.backgroundImage;
  });
 },
 "extreme-prejudice": function () {
  $(".has-autoplayable-media").remove();
 },
/*
 "in-case": function () {
 },
*/
 // The "while you were away" anti-feature is rather annoying:
 "while-away": function () {
  $("[data-item-type='recap_entry']").remove();
 },
 "prefer-small": function () {
    // $(".u-textTruncate").$(".u-dir").css("background-color", "#8f8");
    // $(".FullNameGroup").css("background-color", "#8f8");
    $(".stream-item").each(function () {
      let accountGroup = $(this).find("a.account-group");
      let userId = accountGroup.data("user-id");
      // let url = `https//twitter.com${accountGroup.attr("href")}`;
      let popupUrl = `https://twitter.com/i/profiles/popup?user_id=${userId}`
      $.get({
        url: popupUrl,
        success: function (data) {
          // console.log(JSON.stringify(data));
          let html = JSON.parse(data).html;
          let doc = $(html);
          let statsAnchor = doc.find("[data-element-term='follower_stats']");
          /*
          let parser = new DOMParser();
          let doc = parser.parseFromString(html, "text/html");
          console.log(doc.outerHTML);
          */
          console.log(statsAnchor.get(0).outerHTML);
          let followers = $(".ProfileCardStats-statValue", statsAnchor).data("count");
          console.log(JSON.stringify({
            screen_name: JSON.parse(data).screen_name,
            followers: followers
          }));
        }
      });
    });
    // outer : account-group js-account-group js-action-profile js-user-profile-link js-nav
    // inner: 
//username
//u-dir
 }
 // Twitter extension idea: https://twitter.com/pookleblinky/status/959487077632135169
};

// create an observer instance
var observer = new MutationObserver(function(mutations) {

  var stream = $("#stream-items-id");
  var tweets = stream.children();

  // TODO: incorporate generalized version of "fade-*" options
  // into optionCallbacks schema above.

  // make promoted things stand out
  ["fade-tweet", "fade-account", "fade-trend"].forEach(function (category) {
    chrome.storage.local.get(category, function (setting) {
      if (Object.keys(setting).length == 0 || setting[category]) {
       var className = "."+category.replace("fade", "promoted");
       // set up fade in/out for when hovering promoted things
       $(className).fadeTo("fast", 0.2);
       $(className).hover(
	function () {
	 $(this).fadeTo("slow", 1.0);
	},
	function () {
	 $(this).fadeTo("slow", 0.2);
	}
       );
      }
    });
  });

  // Set up other turned-on features:
  Object.keys(optionCallbacks).forEach(function (optionID) {
    setupOption(optionID, optionCallbacks[optionID]);
  });

  // This creates a second search widget,
  // that delivers "latest" instead of "top" results:
  if ($("#hacked-nav-search").length == 0) {
   var searchForm = $("#global-nav-search").clone(false, true);
   searchForm.attr("id", "hacked-nav-search");
   searchForm.children(".search-input").attr("placeholder", "Search live tweets");
   searchForm.children("#search-query").attr("id", "hacked-query");
   var searchQuery = searchForm.children("#search-query");
   searchQuery.attr("id", "hacked-query");
   searchQuery.css("backgroundColor", "pink"); // why this not working?
   $("#global-nav-search").after(searchForm);

   searchForm.submit(function (event) {
     event.preventDefault();
     window.location.assign(`https://twitter.com/search?q=${encodeURIComponent($("#hacked-query").val())}&f=tweets`);
   });
  }

});


// configuration of the observer:
var config = { childList: true, subtree: true };

// pass in the target node, as well as the observer options
if (target) observer.observe(target, config);

// later, you can stop observing
// observer.disconnect();

