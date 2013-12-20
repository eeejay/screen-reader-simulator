/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
                                  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "AccessFu",
                                  "resource://gre/modules/accessibility/AccessFu.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Logger",
                                  "resource://gre/modules/accessibility/Utils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");

var gBrowserWindow = null;

const OUTPUT_NOTIFY_PREF = 'accessibility.accessfu.notify_output';
const ACTIVATE_PREF = 'accessibility.accessfu.activate';

function debug(data) {
  dump('screen-reader-simulator: ' + data + '\n');
}

function setScreenreaderSetting(aValue) {
  if (gBrowserWindow && gBrowserWindow.navigator.mozSettings) {
    let lock = gBrowserWindow.navigator.mozSettings.createLock();
    lock.set({'accessibility.screenreader' : aValue});
  }
}

function startup(data, reason) {
  function setupWindow() {
    setScreenreaderSetting(false);
    Services.prefs.setIntPref(ACTIVATE_PREF, 2);
    Services.prefs.setBoolPref(OUTPUT_NOTIFY_PREF, true);
    Logger.test = true;
    AccessFu.attach(gBrowserWindow);
  }

  try {
    gBrowserWindow = Services.wm.getMostRecentWindow('navigator:browser');
    if (gBrowserWindow) {
      setupWindow();
    } else {
      Services.obs.addObserver(function() {
          gBrowserWindow = Services.wm.getMostRecentWindow('navigator:browser');
          setupWindow();
        }, 'sessionstore-windows-restored', false);
    }

    // XXX This code is Firefox only and should not be loaded in b2g-desktop.
    try {
      // Register a new devtool panel with various OS controls
      gDevTools.registerTool({
        id: 'screen-reader-controls',
        key: 'V',
        modifiers: 'accel,shift',
        icon: 'chrome://screen-reader-simulator/content/panel/icon.png',
        url: 'chrome://screen-reader-simulator/content/panel/screen-reader-simulator.xul',
        label: 'Screen Reader',
        tooltip: 'Control the mobile screen reader',
        isTargetSupported: function(target) {
          return target.isLocalTab;
        },
        build: function(iframeWindow, toolbox) {
          iframeWindow.wrappedJSObject.tab = toolbox.target.window;
        }
      });
    } catch(e) {
      debug('Can\'t load the devtools panel. Likely because this version of Gecko is too old');
    }

  } catch (e) {
  }
}

function shutdown(data, reason) {
  try {
    gDevTools.unregisterTool('screen-reader-controls');
    Services.prefs.clearUserPref(ACTIVATE_PREF);
    Services.prefs.clearUserPref(OUTPUT_NOTIFY_PREF);

    setScreenreaderSetting(false);
    AccessFu.detach(gBrowserWindow);
  } catch (e) {
    debug('Something went wrong while trying to stop: ' + e);
  }
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

