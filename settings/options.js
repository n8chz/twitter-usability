
// see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Implement_a_settings_page

// if one of the checkboxes is clicked, store the new value of the
// corresponding parameter:
$("input").click(function () {
  var setting = {};
  setting[$(this).attr("id")] = $(this).get(0).checked;
  chrome.storage.local.set(setting);
});

function restoreOptions() {
 // For each checkbox, see if stored value of setting has changed
 $("input").each(function () {
   var id = $(this).attr("id");
   chrome.storage.local.get(id, function (setting) {
     if (Object.keys(setting).length) {
      $("#"+id).get(0).checked = setting[id] ? "checked" : undefined;
     }
     else {
      // This block runs only the first time the settings page is opened.
      init = {};
      init[id] = true;
      chrome.storage.local.set(init);
     }
   });
 });
}

// Handle the "prefer-small" option, which contains a numeric input:

chrome.storage.local.get("follower-ceiling", function (ceiling) {
  $("#follower-ceiling").val(Number(ceiling["follower-ceiling"] || 5000));
});

$("#follower-ceiling").change(function () {
  chrome.storage.local.set({"follower-ceiling": $("#follower-ceiling").val()});
});

document.addEventListener("DOMContentLoaded", restoreOptions);

