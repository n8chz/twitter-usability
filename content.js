// Inject CSS rule to support follower count filtering:
/*
$(function () {
  $("<style>.lose {background-color: \"pink\"}</style>").appendTo($("head"));
});
*/

console.log("content.js checking in");

$(observerCallback); // Count initial page load as if it's a mutation

// see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#Example_usage

// select the target node
// var target = document.querySelector("#page-container");
var target = $("main").get(0);

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

function arrayDiff(array1, array2) {
  let value = [];
  array1.forEach(function (x) {
    if (array2.indexOf(x) == -1) {
      value.push(x);
    }
  });
  return value;
}

/*
function addToList(tweep_id, list_id) {
  $.ajax({
    url: `https://twitter.com/i/${tweep_id}/lists/${list_id}/members`,
    headers: {
      Referer: "https://twitter.com/followers",
    },
    method: "POST",
    success: function (data) {
      console.log(data);
    },
    error: function (error) {
      alert(JSON.stringify(error));
    }
  });
}

addToList(1060033519848689665, 1095707454049079297);
*/

optionCallbacks = {
  "mark-promo": function () {
    $("svg.r-7o8qx1").each(function () {
      // $(this).closest("article").css("border", "12px solid red");
      $(this).closest(".r-qklmqi").css("border", "12px solid red");
      // console.log($(this).html());
    });
  },
  "add-followers-to-list": function () {
  },
  "virgin-tweets": function () {
  },
  "with-replies": function () {
    $("section").each(function () {
      // $(this).css("border", "2px solid orange");
    });
    $("section a, aside a").each(function () {
      url = $(this).attr("href");
      // console.log(url);
      if (url.match(/^\/\w+$/)) {
        // $(this).css("border", "1px solid purple");
        $(this).attr("href", url+"/with_replies");
        $(this).click(function (e) {
          e.preventDefault();
          window.open($(this).attr("href"), "_self"); // h/t vdbuilder https://stackoverflow.com/a/8454535/948073
          $(function () {
            observer.disconnect();
            if (target) observer.observe(target, config);
          });
        });
      }
    });
  },
  "latest-tweets": function () {
  },
  "dismiss-things": function () {
  },
  "autoplaying-media": function () {
  },
  "extreme-prejudice": function () {
  },
  "in-case": function () {
  },
  "while-away": function () {
  },
  "show-contact": function () {
  },
  // New:
  "prefer-small": function () { // h/t Chuck Baggett https://twitter.com/ChuckBaggett/status/958156853455843328
  }
  // Twitter extension idea: https://twitter.com/pookleblinky/status/959487077632135169
};

// create an observer instance
var observer = new MutationObserver(observerCallback);

function observerCallback(mutations) {

  // console.log("mutation observed");

  // Set up other turned-on features:
  Object.keys(optionCallbacks).forEach(function (optionID) {
    setupOption(optionID, optionCallbacks[optionID]);
  });

  // This creates a second search widget,
  // that delivers "latest" instead of "top" results:
  /*
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
  */

}


// configuration of the observer:
var config = { childList: true, subtree: true };

// pass in the target node, as well as the observer options
if (target) observer.observe(target, config);

// later, you can stop observing
// observer.disconnect();

