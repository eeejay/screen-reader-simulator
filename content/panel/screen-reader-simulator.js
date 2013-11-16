/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

!function() {

const OUTPUT_NOTIFY_PREF = 'accessibility.accessfu.notify_output';
const ACTIVATE_PREF = 'accessibility.accessfu.activate';

function ScreenReader() {
  Components.utils.import("resource://gre/modules/accessibility/AccessFu.jsm");
  Components.utils.import("resource://gre/modules/accessibility/Utils.jsm");
  Components.utils.import('resource://gre/modules/Services.jsm');

  window.document.addEventListener(
    'DOMContentLoaded',
    function (e) {
      if (Utils.win && Utils.win.navigator.mozSettings) {
        var toggleButton = window.document.getElementById('screenreader-toggle');
        this.settings = Utils.win.navigator.mozSettings;
        var lock = this.settings.createLock();
        var req;
        req = lock.get('accessibility.screenreader').onsuccess = function () {
          toggleButton.checked = req.result && !!req.result['accessibility.screenreader'];
        }
        this.settings.addObserver(
          'accessibility.screenreader',
          function (evt) {
            toggleButton.checked = !!evt.settingValue;
          });
      } else {
        function onPrefChanged(aSubject, aTopic, aData) {
          var value = aSubject.QueryInterface(Ci.nsIPrefBranch).
            getIntPref('accessibility.accessfu.activate');
          toggleButton.checked = value == 1;
        }
        Services.prefs.addObserver('accessibility.accessfu.activate', onPrefChanged, false);
      }
    }.bind(this));
}

ScreenReader.prototype = {
  toggle: function toggle(enabled) {
    if (this.settings) {
      var lock = this.settings.createLock();
      lock.set({'accessibility.screenreader' : enabled});
    } else {
      Services.prefs.setIntPref(ACTIVATE_PREF, enabled ? 1 : 0);
    }

    if (enabled) {
      if (Services.prefs.prefHasUserValue(OUTPUT_NOTIFY_PREF)) {
        this._previousOutputPref = Services.prefs.getBoolPref(OUTPUT_NOTIFY_PREF);
      } else {
        delete this._previousOutputPref;
      }
      Services.prefs.setBoolPref(OUTPUT_NOTIFY_PREF, true);
      Services.obs.addObserver(this, 'accessfu-output', false);
      Logger.test = true;
      Services.console.registerListener(this);
    } else {
      if (this._previousOutputPref == undefined) {
        Services.prefs.clearUserPref(OUTPUT_NOTIFY_PREF);
      } else if (!this._previousOutputPref){
        Services.prefs.setBoolPref(OUTPUT_NOTIFY_PREF, false);
      }
      Services.obs.removeObserver(this, 'accessfu-output');
      Logger.test = false;
      Services.console.unregisterListener(this);
    }
  },

  start: function start() {
  },

  observe: function observe(aSubject, aTopic, aData) {
    if (aSubject instanceof Components.interfaces.nsIConsoleMessage) {
      var message = aSubject.message;
      var match = /\[AccessFu\]\s(\S+)\s([\s\S]*)/.exec(message);
      if (match)
        this._log(match[2], ['logMessage', match[1].toLowerCase() + 'Message']);
      return;
    }

    if (aTopic != 'accessfu-output')
      return;

    var data = JSON.parse(aData);

    for (var i in data) {
      if (!data[i])
        continue;

      if (data[i].type == 'Speech') {
        var actions = data[i].details.actions;

        for (var ii in actions) {
          if (actions[ii].method == 'speak') {
            this._log(actions[ii].data, ['speech']);
          }
        }
      }
    }
  },

  _log: function _log(aMessage, aClasses) {
    var output = window.document.getElementById('sr-output');
    var span = window.document.createElement('richlistitem');
    span.innerHTML = aMessage;
    for (var i in aClasses) {
      span.classList.add(aClasses[i]);
    }
    var item = output.appendChild(span);
    output.ensureElementIsVisible(item);
  },

  swipeRight: function swipeRight(aFingerNum) {
    this._emitGesture({x1: 0, x2: 100, y1: 0, y2: 0, type: 'swiperight'}, aFingerNum);
  },

  swipeLeft: function swipeLeft(aFingerNum) {
    this._emitGesture({x1: 100, x2: 0, y1: 0, y2: 0, type: 'swipeleft'}, aFingerNum);
  },

  swipeUp: function swipeUp(aFingerNum) {
    this._emitGesture({x1: 0, x2: 0, y1: 100, y2: 0, type: 'swipeup'}, aFingerNum);
  },

  swipeDown: function swipeDown(aFingerNum) {
    this._emitGesture({x1: 0, x2: 0, y1: 0, y2: 100, type: 'swipedown'}, aFingerNum);
  },

  doubleTap: function doubleTap(aFingerNum) {
    this._emitGesture({x1: 0, x2: 0, y1: 0, y2: 0, type: 'doubletap'}, aFingerNum);
  },

  _emitGesture: function _emitGesture(aDetails, aFingerNum) {
    let details = {touches: []};
    for (let detail in aDetails)
      details[detail] = aDetails[detail];
    for (var i = 0; i < aFingerNum; i++)
      details.touches.push(i);
    let evt = Utils.win.document.createEvent('CustomEvent');
    evt.initCustomEvent('mozAccessFuGesture', true, true, details);
    Utils.win.dispatchEvent(evt);
  },

  loggingChanged: function loggingChanged(aMenuList) {
    Logger.logLevel = aMenuList.selectedIndex;
  },

  _speechService: null
};
window.screenReader = new ScreenReader();

}();
