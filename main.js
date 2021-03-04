require([
  "esri/Map",
  "esri/views/MapView",
  "esri/tasks/Locator",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol"
], function (Map, MapView, Locator, Graphic, GraphicsLayer, PictureMarkerSymbol) {

  var usePaidApi = false;
  var batchSize = 5;
  var timeout = 150;

  var map = new Map({
    basemap: "gray"
  });

  var view = new MapView({
    container: "viewDiv",
    map: map,
    center: [16, 44.75],
    zoom: 8
  });

  var symbol = {
    type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
    style: "circle",
    color: "green",
    size: "6px",  // pixels
    outline: {  // autocasts as new SimpleLineSymbol()
      color: [0, 0, 0],
      width: 1  // points
    }
  };

  var locator = new Locator({
    url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
  });

  $.ajax({
    type: "GET",
    url: "locations.text",
    dataType: "text",
    success: function (data) {
      console.log("Succesfully loaded data from locations.txt");
      processLocations(data, "red");
    }
  });

  function processLocations(allText, color) {
    var allTextLines = allText.split(/\r\n|\n/);
    allTextLines[0].split(',');

    console.log("Received", allTextLines.length, "items. Processing ", batchSize, "items at once,  waiting for", timeout, "between batches. Color: ", color);
    var addresses = buildAddresses(allTextLines);

    getLocations(addresses, color);
  }

  function getLocations(addresses, color) {
    // Tries to get all addresses at the same time
    if (usePaidApi) {
      console.log("Using paid API ", addresses.length, " addresses");
      locator.addressesToLocations({ addresses: addresses }).then(function (res) {
        res.forEach(address => {
          addGraphic(address.location, color);
        });
      }).catch((() => {
        console.log("Failed to get data with this account... Starting fetching data location by location");
        getLocationsOneByOne(addresses, color);
      }));
    } else {
      console.log("Using free API for ", addresses.length, " addresses");
      getLocationsOneByOne(addresses, color);
    }
  }

  function getLocationsOneByOne(addresses, color) {
    let succesfull = 0;

    for (let i = 0; i < addresses.length; i++) {
      console.log("Started working on ", i, "item", addresses[0]);
      let t = setInterval(function () {
        const requestData = { address: addresses[i] };
        console.log("Building request... ", requestData);

        locator.addressToLocations(requestData).then(function (response) {
          console.log("Finished request ", requestData, "and got response: ", response);
          addGraphic(response[0].location, color);

          if (++succesfull % 50 == 0 || succesfull == addresses.length) {
            console.log("Fetched: ", succesfull, " out of ", addresses.length, "locations. Total items drawn: ", view.graphics.length);
          }

          clearInterval(t);

        }).catch(onrejectionhandled => {
          console.log("Something failed: ", onrejectionhandled);
        });
      }, timeout);
    }
  }

  function buildAddresses(allTextLines) {
    var addresses = [];
    for (let i = 1; i < allTextLines.length; i++) {
      let data = allTextLines[i].split(',');
      let address = { "singleLine": data[0] + ", " + data[3] + ", " + data[1] + ", " + "HR", };
      addresses.push(address);
    }

    console.log("Finished preparing file: ", addresses);

    return addresses;
  }

  function addGraphic(location, color) {
    var graphic = new Graphic({
      geometry: {
        type: "point",
        longitude: location.longitude,
        latitude: location.latitude
      },
      symbol: symbol
    });

    graphic.symbol.color = color;
    view.graphics.add(graphic);
  }
});