// ==UserScript==
// @id             iitc-plugin-portal-immunity
// @name           IITC plugin: Portal Immunity
// @category       Layer
// @version        0.3.0.20150000.00001
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/nobotta98/ingress-test/raw/master/portalImmunity.user.js
// @downloadURL    https://github.com/nobotta98/ingress-test/raw/master/portalImmunity.user.js
// @description    Show portal portal immunity the map.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () {
    };

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
    plugin_info.buildName = 'unknown';
    plugin_info.dateTimeVersion = '20150000.000000';
    plugin_info.pluginId = 'portal-immunity';
//END PLUGIN AUTHORS NOTE


// PLUGIN START ////////////////////////////////////////////////////////
    window.PORTAL_IMMUNITY_MAX_TIME = 14 * 24 * 60 * 60 * 1000; // in milliseconds
    window.PORTAL_IMMUNITY_TIME = 60 * 60 * 1000; // in milliseconds
// use own namespace for plugin
    window.plugin.portalImmunity = function () {
    };

    window.plugin.portalImmunity.NAME_WIDTH = 80;
    // default : 23
    window.plugin.portalImmunity.NAME_HEIGHT = 35;

    window.plugin.portalImmunity.labelLayers = {};
    window.plugin.portalImmunity.labelLayerGroup = null;
    window.plugin.portalImmunity.stored_immunity = {};

    if (!window.plugin.portalImmunity.json_suffix) {
        window.plugin.portalImmunity.json_suffix = 'default';
    }
    window.plugin.portalImmunity.key_immunity_nominated = '';
    window.plugin.portalImmunity.key_immunity_nominated_guid = '';

    window.plugin.portalImmunity.setupCSS = function () {
        $("<style>").prop("type", "text/css").html(''
            + '.plugin-portal-immunity{'
            + 'color:#FFFFBB;'
            + 'font-size:11px;line-height:12px;'
            + 'text-align:center;padding: 2px;'  // padding needed so shadow doesn't clip
            + 'overflow:hidden;'
// could try this if one-line names are used
//    +'white-space: nowrap;text-overflow:ellipsis;'
            + 'text-shadow:1px 1px #000,1px -1px #000,-1px 1px #000,-1px -1px #000, 0 0 5px #000;'
            + 'pointer-events:none;'
            + '}'
        ).appendTo("head");
    };


    window.plugin.portalImmunity.removeLabel = function (guid) {
        var previousLayer = window.plugin.portalImmunity.labelLayers[guid];
        if (previousLayer) {
            window.plugin.portalImmunity.labelLayerGroup.removeLayer(previousLayer);
            delete plugin.portalImmunity.labelLayers[guid];
        }
    };

    window.plugin.portalImmunity.addLabel = function (guid, latLng) {
        var previousLayer = window.plugin.portalImmunity.labelLayers[guid];
        if (!previousLayer) {

            var d = window.portals[guid].options.data;
            var key = d.latE6 + '_' + d.lngE6;
            var immunityLog;
            if (immunityLog = window.plugin.portalImmunity.stored_immunity[key]) {
                var label = L.marker(latLng, {
                    icon: L.divIcon({
                        className: 'plugin-portal-immunity',
                        iconAnchor: [window.plugin.portalImmunity.NAME_WIDTH / 2, 0],
                        iconSize: [window.plugin.portalImmunity.NAME_WIDTH, window.plugin.portalImmunity.NAME_HEIGHT],
                        html: window.plugin.portalImmunity.buildLabelHtml(immunityLog)
                    }),
                    guid: guid
                });
                window.plugin.portalImmunity.labelLayers[guid] = label;
                label.addTo(window.plugin.portalImmunity.labelLayerGroup);
            }
        }
    };

    window.plugin.portalImmunity.buildLabelHtml = function (immunity) {
        var immunityTimes = [];
        var date_ = new Date();
        var currentTime = date_.getTime();
        immunity.forEach(function (v, i) {
            var style = 'color:#8CFFBF';
            var timeEnd = v + PORTAL_IMMUNITY_TIME;
            var format = 'MM/DD hh:mm:ss';
            date_.setTime(timeEnd);
            var diff = timeEnd - currentTime;
            if (diff > 0) {
                if (diff < 600000) {
                    style = 'color:#FF7314';
                } else {
                    style = 'color:#FCF28C';
                }
            }
            if (Math.abs(diff) < 24 * 3600 * 1000) {
                format = 'hh:mm:ss';
            }
            immunityTimes.push('<span style="' + style + '">' + formatDate(date_, format) + '</span>');
        });
        return immunityTimes.join('<br />');
    };

    window.plugin.portalImmunity.clearAllPortalLabels = function () {
        for (var guid in window.plugin.portalImmunity.labelLayers) {
            window.plugin.portalImmunity.removeLabel(guid);
        }
    };


    window.plugin.portalImmunity.updatePortalLabels = function () {
        // as this is called every time layers are toggled, there's no point in doing it when the leyer is off
        if (!map.hasLayer(window.plugin.portalImmunity.labelLayerGroup)) {
            return;
        }

        var portalPoints = {};
        for (var guid in window.portals) {
            var p = window.portals[guid];
            if (p._map) {
                var point = map.project(p.getLatLng());
                portalPoints[guid] = point;
            }
        }
        // and add those we do
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: '//ingress-test.sakura.ne.jp/release/plugin/portal_immunity/portalImmunity_' + window.plugin.portalImmunity.json_suffix + '.json',
            success: function (data) {
                window.plugin.portalImmunity.stored_immunity = data;
                for (var guid in portalPoints) {
                    window.plugin.portalImmunity.addLabel(guid, portals[guid].getLatLng());
                }
            }
        });
    };


// ass calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
    window.plugin.portalImmunity.delayedUpdatePortalLabels = function (wait) {
        if (window.plugin.portalImmunity.timer === undefined) {
            window.plugin.portalImmunity.timer = setTimeout(function () {
                window.plugin.portalImmunity.timer = undefined;
                window.plugin.portalImmunity.updatePortalLabels();
            }, wait * 1000);

        }
    };


    function formatDate(date, format) {
        if (!format) format = 'YYYY-MM-DD hh:mm:ss.SSS';
        format = format.replace(/YYYY/g, date.getFullYear());
        format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
        format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
        format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
        format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
        format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
        if (format.match(/S/g)) {
            var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
            var length = format.match(/S/g).length;
            for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
        }
        return format;
    }

    var setup = function () {
        window.plugin.portalImmunity.setupCSS();

        window.plugin.portalImmunity.labelLayerGroup = new L.LayerGroup();
        window.addLayerGroup('Portal Immunity', window.plugin.portalImmunity.labelLayerGroup, true);

        window.addHook('requestFinished', function () {
            setTimeout(function () {
                window.plugin.portalImmunity.delayedUpdatePortalLabels(3.0);
            }, 1);
        });
        window.addHook('mapDataRefreshEnd', function () {
            window.plugin.portalImmunity.delayedUpdatePortalLabels(0.5);
        });
        window.map.on('overlayadd overlayremove', function () {
            setTimeout(function () {
                window.plugin.portalImmunity.delayedUpdatePortalLabels(1.0);
            }, 1);
        });
        window.map.on('zoomend', window.plugin.portalImmunity.clearAllPortalLabels);

        addHook('publicChatDataAvailable', window.plugin.portalImmunity.handleData);

    };

    window.plugin.portalImmunity.handleData = function (data) {
        var limit = plugin.portalImmunity.getLimit();
        var lastTime = 0;
        var isFound = false;
        var updateKeys = {};

        if (data.length < 2) {
            return;
        }
        $.each(data.result, function (ind, json) {
            // skip old data
            if (json[1] < limit) {
                return true;
            }

            // skip registered immunity portal
            if (json[1] === lastTime) {
                return true;
            } else {
                lastTime = 0;
            }

            var hash = window.plugin.portalImmunity.getPortalImmunity(json);
            if (hash) {
                var key = hash.latE6 + '_' + hash.lngE6, immunity;
                lastTime = hash.time;
                if (immunity = window.plugin.portalImmunity.stored_immunity[key]) {
                    var old = immunity.join('_');
                    immunity.push(hash.time);
                    immunity.sort().reverse();

                    // within 10sec same immunity
                    if (immunity.length > 1) {
                        for (var i = immunity.length - 1; i > 0; i--) {
                            if ((immunity[i - 1] - immunity[i]) < 10000) {
                                immunity.splice(i - 1, 1);
                            }
                        }
                    }
                    if (old !== immunity.join('_')) {
                        window.plugin.portalImmunity.stored_immunity[key] = immunity;
                        updateKeys[key] = true;
                    }
                } else {
                    window.plugin.portalImmunity.stored_immunity[key] = [hash.time];
                    updateKeys[key] = true;
                }
            }
        });

        if (Object.keys(updateKeys).length > 0) {
            var update_data = [];

            Object.keys(updateKeys).forEach(function (k) {
                var p = window.plugin.portalImmunity.stored_immunity[k];
                update_data.push([k, p.join('_')].join('__'));
            });
            $.ajax({
                type: 'GET',
                dataType: 'text',
                data: {type: window.plugin.portalImmunity.json_suffix, data: update_data.join(',')},
                url: '//ingress-test.sakura.ne.jp/release/plugin/portal_immunity/log.php',
                success: function (data) {
                    window.plugin.portalImmunity.updatePortalLabels();
                }
            });
        }
    };

    window.plugin.portalImmunity.getLimit = function () {
        return new Date().getTime() - window.PORTAL_IMMUNITY_MAX_TIME;
    };

    window.plugin.portalImmunity.getPortalImmunity = function (json) {
        var markup = json[2].plext.markup;
        var action = markup[1][1]['plain'];

        if (markup.length < 3 || markup[0][0] !== 'PLAYER') {
            return;
        }
        var player_team = markup[0][1]['team'];
        var portal_team = markup[2][1]['team'];

        if (action === ' destroyed a Resonator on ') {
            if (player_team === portal_team) {
                return {
                    time: json[1],
                    name: markup[2][1]['name'],
                    latE6: markup[2][1]['latE6'],
                    lngE6: markup[2][1]['lngE6']
                };
            } else {
                var key_nominate = json[1] + '_' + markup[2][1]['latE6'] + '_' + markup[2][1]['lngE6'];
                if (window.plugin.portalImmunity.key_immunity_nominated_guid !== json[0] && window.plugin.portalImmunity.key_immunity_nominated === key_nominate) {
                    window.plugin.portalImmunity.key_immunity_nominated = '';
                    window.plugin.portalImmunity.key_immunity_nominated_guid = '';
                    return {
                        time: json[1],
                        name: markup[2][1]['name'],
                        latE6: markup[2][1]['latE6'],
                        lngE6: markup[2][1]['lngE6']
                    };
                }
                window.plugin.portalImmunity.key_immunity_nominated = key_nominate;
                window.plugin.portalImmunity.key_immunity_nominated_guid = json[0];
            }
        } else if (action === ' destroyed a Control Field @') {
            if (player_team === portal_team) {
                return {
                    time: json[1],
                    name: markup[2][1]['name'],
                    latE6: markup[2][1]['latE6'],
                    lngE6: markup[2][1]['lngE6']
                };
            }
        }
        // @todo Difficult to determine in the one line log
        /*
         else if (action === ' destroyed the Link ') {
         if (player_team === portal_team) {
         return {
         time: json[1],
         name: markup[2][1]['name'],
         latE6: markup[2][1]['latE6'],
         lngE6: markup[2][1]['lngE6']
         };
         } else if (player_team === markup[4][1]['team']) {
         return {
         time: json[1],
         name: markup[4][1]['name'],
         latE6: markup[4][1]['latE6'],
         lngE6: markup[4][1]['lngE6']
         };
         }
         }
         */
        return false;
    };

// PLUGIN END //////////////////////////////////////////////////////////


    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
};
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);


