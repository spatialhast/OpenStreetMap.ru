$(function() {
  if (typeof frame_map === "undefined") frame_map = false; // in frame_map mode we have limited controls and map abilities

  osm.initLayers();

  var mapOptions = osm.permalink.startLoadPos();
  mapOptions['zoomControl'] = false;
  mapOptions['zoomsliderControl'] = true;
  osm.map = new L.Map('map', mapOptions);
  
  osm.permalink.start();
  
  L.Icon.Default.imagePath='/img';
  osm.markers.initialize();
  osm.markers.readMap();

  if (!frame_map) {
    $("#leftpan div h1").bind('click',function(){
      osm.leftpan.toggleItem(this.parentNode.id);
    });
    osm.leftpan.on=true;
    osm.leftpan.refsizetab();
  }

  osm.map.control_layers = new L.Control.Layers(
    osm.baseLayers,
    osm.overlays,
    {
      layerHashes: osm.layerHashes
    }
  );
  osm.permalink.include(osm.map.control_layers);
  osm.map.addControl(osm.map.control_layers);
  
  osm.map.addLayer(mapOptions['baseLayer']);
  for (var i in mapOptions['overlays'])
    osm.map.addLayer(mapOptions['overlays'][i]);

 if (!frame_map) {
  osm.leftpan.panel = $_('leftpan');
  osm.leftpan.content = $_('content_pan');
  osm.mappan.panel = $_('mappan');
  osm.input = $_('qsearch');
  osm.input.focus();
  osm.search_marker = new L.LayerGroup();
  osm.map.addLayer(osm.search_marker);

  if (osm.p.cookie.htp == "false")
    osm.toppan_toggle(false);
  if (osm.p.cookie.leftpan == "false")
    osm.leftpan.toggle(false);

  osm.map.addControl(new L.Control.Scale({width: 100, position: 'bottomleft'}));

  osm.map.addControl(new L.Control.Distance());
  osm.map.addControl(new L.Control.inJOSM({target:'hiddenIframe', linktitle: 'Редактировать в JOSM'}));
  osm.validators.initialize();
  osm.poi.initialize();

  search.inLoad();

  osm.editUpdate();
  osm.map.on('moveend', osm.editUpdate);

  osm.setLinkOSB();

  if (osm.p.get.hidetoppan) osm.toppan_toggle(false);

  if ($('#leftpantab').height()>300)
    osm.dyk.load();
  $(window).resize(osm.leftpan.refsizetab);

  osm.map.on('moveend', osm.opento);
  osm.opento();
  
  $('body').keypress(osm.keypress);
 }
 
 if (frame_map)
  FramePos();
 
});


osm.keypress = function(e) {
  if (e.keyCode == 8) {
    if (e.target.id != 'qsearch') {
      var search = $('#qsearch');
      search.focus();
      var text = search.val();
      text = text.substr(0, text.length - 1);
      search.val(text);
      return false;
    }
  }
}


osm.permalink = {
  p:{},
  defaults:{
    baseLayer:'layerMS',
    center: new L.LatLng(62.0, 88.0),
    zoom: ($(window).width() > 1200 ? 3 : 2)
  }
};

$(function() {
if (!frame_map) {
  osm.sManager.on(['zoom','lat','lon'], osm.permalink.setPos);
  osm.sManager.on(['layer'], osm.permalink.setLayer);
  osm.sManager.on(['marker'], osm.permalink.setMarker);
  
  osm.map.on('baselayerchange', osm.permalink.updLayer);
  osm.map.on('overlayadd', osm.permalink.updLayer);
  osm.map.on('overlayremove', osm.permalink.updLayer);
  }
})

osm.permalink.startLoadPos = function() {
  var loc = '', overlays = '', strLayer;
  var baseLayer = osm.layers[this.defaults.baseLayer].options.osmHash;
  var ret = {
    center: this.defaults.center,
    zoom: this.defaults.zoom
  };
  
  if ((osm.p.anchor['lat'] || osm.p.anchor['lon'])
        && osm.p.anchor['zoom']) {
    ret['center'] = new L.LatLng(osm.p.anchor['lat'], osm.p.anchor['lon']);
    ret['zoom'] = osm.p.anchor['zoom'];
    if (strLayer = osm.sManager.decodeURI(osm.p.anchor['layer'])) {
      baseLayer = strLayer[0];
      if (strLayer.length > 1)
        overlays = strLayer.substring(1);
    }
  }
  else if ((osm.p.get['lat'] || osm.p.get['lon'])
        && osm.p.get['zoom']) {
    ret['center'] = new L.LatLng(osm.p.get['lat'], osm.p.get['lon']);
    ret['zoom'] = osm.p.get['zoom'];
    if (strLayer = osm.sManager.decodeURI(osm.p.get['layer'])) {
      baseLayer = strLayer[0];
      if (strLayer.length > 1)
        overlays = strLayer.substring(1);
      osm.sManager.setP('layer', osm.p.get.layer, 'anchor'), delete osm.p.get['layer'];
    }
    osm.sManager.setP('lat', osm.p.get.lat, 'anchor'), delete osm.p.get['lat'];
    osm.sManager.setP('lon', osm.p.get.lon, 'anchor'), delete osm.p.get['lon'];
    osm.sManager.setP('zoom', osm.p.get.zoom, 'anchor'), delete osm.p.get['zoom'];
    osm.sManager.updGet();
  }
  else if (!frame_map && (osm.p.cookie['lat'] || osm.p.cookie['lon'])
        && osm.p.cookie['zoom']) {
    ret['center'] = new L.LatLng(osm.p.cookie['lat'], osm.p.cookie['lon']);
    ret['zoom'] = osm.p.cookie['zoom'];
    if (osm.p.cookie['layer']) {
      baseLayer = osm.p.cookie['layer'][0];
      if (osm.p.cookie['layer'].length > 1)
        overlays = osm.p.cookie['layer'].substring(1);
    }
  }
  
  ret['baseLayer'] = osm.layers[osm.layerHash2name[baseLayer]];
  
  ret['overlays'] = {}
  for (var i in overlays) {
    var over = osm.layers[osm.layerHash2name[overlays[i]]];
    if (over)
      ret.overlays[over.options.osmName] = over;
  }
  
  this.p['center'] = ret.center;
  this.p['zoom'] = ret.zoom;
  this.p['baseLayer'] = ret.baseLayer;
  this.p['overlays'] = ret.overlays;
  
  return ret;
}

osm.permalink.start = function() {
  this.updPos();
  osm.map.on('moveend', osm.permalink.updPos);
  
  if (osm.layers[this.defaults.baseLayer] != this.p.baseLayer || !$.isEmptyObject(this.p.overlays))
    this.updLayerP();
};

osm.permalink.setPos = function() {
  console.debug(new Date().getTime() + ' start fn osm.permalink.setPos');
  if (isUnd(osm.permalink.p.center))
    osm.permalink.p.center = osm.permalink.defaults.center;

  if (isUnd(osm.permalink.p.zoom))
    osm.permalink.p.zoom = osm.permalink.defaults.zoom;
  
  if (!isUnd(osm.p.anchor['lat']) && !isUnd(osm.p.anchor['lon']) && osm.p.anchor['zoom']) {
    osm.permalink.p.center = new L.LatLng(osm.p.anchor['lat'], osm.p.anchor['lon']);
    osm.permalink.p.zoom = osm.p.anchor['zoom'];
  }
  
  if (osm.permalink.p.center != osm.map.getCenter() || osm.permalink.p.zoom != osm.map.getZoom())
    osm.map.setView(osm.permalink.p.center, osm.permalink.p.zoom);
};

osm.permalink.setLayer = function() {
  console.debug(new Date().getTime() + ' start fn osm.permalink.setLayer');
  var baseLayer = '';
  var strLayer = osm.sManager.decodeURI(osm.p.anchor['layer']);
  if (strLayer && strLayer.length > 0) {
    // разбор строки
    baseLayer = osm.layers[osm.layerHash2name[strLayer[0]]];
    osm.permalink.p.overlays = {};
    var overlays = [];
    if (strLayer.length > 1) {
      for (var i = 1; i < strLayer.length; i++) {
        var over = osm.layers[osm.layerHash2name[strLayer[i]]];
        if (over)
          overlays.push(over);
          osm.permalink.p.overlays[over.options.osmName] = over;
      }
    }
    // базовый слой
    if (!isUnd(baseLayer) && baseLayer != osm.permalink.p.baseLayer){
      osm.map.removeLayer(osm.permalink.p.baseLayer);
      osm.map.addLayer(baseLayer);
      osm.permalink.p.baseLayer = baseLayer;
    }
    // прозрачные слои
    if (!isUnd(overlays)) {
      var listCurOv = osm.map.control_layers.listCurrentOverlays();
      for (var n in listCurOv) {
        var i = overlays.indexOf(listCurOv[n].layer);
        if (i == -1)
          osm.map.removeLayer(listCurOv[n].layer);
        else
          overlays.splice(i, 1);
      }
      for (n in overlays)
        osm.map.addLayer(overlays[n]);
    }
  }
}

osm.permalink.setMarker = function() {
  console.debug(new Date().getTime() + ' start fn osm.permalink.setMarker');
  if (osm.permalink.p.marker === osm.p.anchor.marker)
    return;
  
  if (isUnd(osm.permalink.p.marker))
    osm.permalink.p.marker = false;
  
  if (!isUnd(osm.p.anchor.marker))
    osm.permalink.p.marker = !!Number(osm.p.anchor.marker);
  
  if (osm.permalink.p.marker !== osm.p.anchor.marker)
    osm.sManager.setP('marker', Number(osm.permalink.p.marker), 'anchor')
  
  if (osm.permalink.p.marker)
    osm.permalink.setPopupMarker(osm.permalink.p.center, true);
  else if (osm.permalink.LMarker)
    osm.map.removeLayer(osm.permalink.LMarker), delete osm.permalink.LMarker;
}

osm.permalink.updPos = function() {
  console.debug(new Date().getTime() + ' start fn osm.permalink.updPos');
  var zoom = osm.map.getZoom();
  var center = osm.permalink.rounding(zoom, osm.map.getCenter());
  
  osm.sManager.setP('zoom', zoom, 'anchor');
  osm.sManager.setP('lat', center.lat, 'anchor');
  osm.sManager.setP('lon', center.lng, 'anchor');
  osm.sManager.setP('zoom', zoom, 'cookie');
  osm.sManager.setP('lat', center.lat, 'cookie');
  osm.sManager.setP('lon', center.lng, 'cookie');
}

osm.permalink.rounding = function(zoom, pos) {
  var precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
  pos.lat = Number(pos.lat.toFixed(precision));
  pos.lng = Number(pos.lng.toFixed(precision));
  return pos;
}

osm.permalink.updLayer = function(obj) {
  console.debug(new Date().getTime() + ' start fn osm.permalink.updLayer');
  if (obj.type == 'baselayerchange') {
    osm.permalink.p.baseLayer = obj.layer;
  }
  else if (obj.type == 'overlayadd') {
    osm.permalink.p.overlays[obj.layer.options.osmName] = obj.layer;
  }
  else if (obj.type == 'overlayremove') {
    delete osm.permalink.p.overlays[obj.layer.options.osmName];
  }
  
  osm.permalink.updLayerP ();
}

osm.permalink.updLayerP = function () {
  var hash = '';
  hash += this.p.baseLayer.options.osmHash;
  for(var i in this.p.overlays)
    hash += this.p.overlays[i].options.osmHash;
  
  osm.sManager.setP('layer', hash, 'anchor');
  console.debug('updLayerP - ' + hash);
  osm.sManager.setP('layer', hash, 'cookie');
}

osm.permalink.addMarker = function () {
  osm.map.on('click', osm.permalink.createMarker);
  $('#map').css('cursor','crosshair');
}

osm.permalink.createMarker = function(e) {
  osm.map.off('click', osm.permalink.createMarker);
  $('#map').css('cursor','');
  osm.permalink.setPopupMarker(e.latlng);
}

osm.permalink.setPopupMarker = function (pos, center) {
  if (isUnd(center)) var center = false;
  var zoom = osm.map.getZoom();
  pos = this.rounding(zoom, pos);
  
  if (this.LMarker)
    osm.map.removeLayer(this.LMarker);
  this.LMarker = new L.Marker(pos);
  osm.map.addLayer(this.LMarker);
  var url = '/#' + 'lat=' + pos.lat + '&lon=' + pos.lng + '&zoom=' + zoom + '&marker=1';
  var popup = this.LMarker.bindPopup('<a href="'+url+'">Ссылка на маркер</a>');
  if (!center)
    popup.openPopup();
}

osm.permalink.include = function(obj){
  obj.currentBaseLayer = function() {
    for (var i in this._layers) {
      if (!this._layers.hasOwnProperty(i))
        continue;
      var obj = this._layers[i];
      if (obj.overlay) continue;
      if (!obj.overlay && this._map.hasLayer(obj.layer))
        return obj;
    }
  };
  obj.listCurrentOverlays = function() {
    var result = [];
    for (var i in this._layers) {
      if (!this._layers.hasOwnProperty(i))
        continue;
      var obj = this._layers[i];
      if (!obj.overlay) continue;
      if (this._map.hasLayer(obj.layer))
        result.push(obj);
    }
    return result;
  }
}