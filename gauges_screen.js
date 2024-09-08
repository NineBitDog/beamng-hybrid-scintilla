//console.log("load gaugesScreen");
angular.module('gaugesScreen', [])

  .controller('GaugesScreenController', function ($scope, $element, $window) {
    "use strict";
    var vm = this;

    var svg;

    var speedoDisplay = { };
    var tacho = {  };
    var pages = {};
    var infoDisplay = {};
    var electrics = {lights:{}, dse:{} };
    var gagues = {page1:{},page2:{},page2_gmeter:{},page2_tires_pres:{},page2_tires_term:{},page2_text:{}};

    var currentGear = '';
    var cachedPage = {page1:false,page2:false};
    var refreshAng = 0.25*Math.PI/180;

    var ready = false;

    var units = {uiUnitConsumptionRate: "metric",
    uiUnitDate: "ger",
    uiUnitEnergy: "metric",
    uiUnitLength: "metric",
    uiUnitPower: "hp",
    uiUnitPressure: "bar",
    uiUnitTemperature: "c",
    uiUnitTorque: "metric",
    uiUnitVolume: "l",
    uiUnitWeight: "kg"};
    var unitspeedConv = 3.6;
    var rpmRatio = 0.1;

    function getNodesArray(prefix,number, root){
      let arr= [];
      for(let i=0;i<number;i++){
        let node = hu(prefix+i, root)
        if(!node)
          console.error(prefix+i,"node not found")
        else
          arr.push(node)
      }
      return arr;
    }

    function getRndInteger(min, max) {
      return Math.floor(Math.random() * (max - min) ) + min;
    }

    // Make sure SVG is loaded
    $scope.onSVGLoaded = function () {
      svg = $element[0].children[0].children[0];

      // speedometer
      speedoDisplay.root = hu('#speedometer', svg);
      speedoDisplay.speedometerText = hu('#speedometerText', speedoDisplay.root)
      speedoDisplay.speedValue = hu('#speed_val', svg);
      speedoDisplay.speedUnit = hu('#speed_unit', svg);
      speedoDisplay.gears = hu('#gear_txt', svg);

      tacho.markers_root = hu('#rpm_markers', svg);
      tacho.markers = getNodesArray("#rpm_markers_",21,tacho.markers_root)
      tacho.needle = hu('#needle', svg);

      electrics.lights.signal_L = hu("#light_signal_L", svg);
      electrics.lights.signal_R = hu("#light_signal_R", svg);
      electrics.lights_lights = hu("#light_lights", svg);
      electrics.lights_highbeam = hu("#light_highbeam", svg);
      electrics.lights.lowpressure = hu("#light_lowpressure", svg);
      electrics.lights.parkingbrake = hu("#light_parkingbrake", svg);
      electrics.lights.checkengine = hu("#light_checkengine", svg);
      electrics.lights.lowfuel = hu("#fuel_logo", svg);
      electrics.lights_battery = hu("#lights_battery", svg);
      electrics.odo_txt = hu("#odo_txt", svg);

      electrics.mode_txt = hu("#mode_txt", svg);
      electrics.backgroundFilter = hu("#feColorMatrix_BG", svg);

      electrics.dse.esc = hu("#esc_txt", svg);
      electrics.dse.tcs = hu("#tcs_txt", svg);
      electrics.dse.pwrtrain = hu("#light_4wd", svg);
      electrics.dse.sus = hu("#light_suspension", svg);

      pages.page1 = hu("#page1", svg);
      pages.page2_gmeter = hu("#page2_gmeter", svg);
      pages.page2_tires = hu("#page2_tires", svg);
      pages.page2_text = hu("#page2_text", svg);
      pages.page2_common = hu("#page2_common", svg);
      pages.page_R = hu("#page_R", svg);
      pages.page_R_odo = hu("#page_R_odo", svg);
      pages.page1.n.style.display = "inline";
      pages.page2_gmeter.n.style.display = "inline";
      pages.page2_tires.n.style.display = "inline";
      pages.page2_text.n.style.display = "inline";
      pages.page2_common.n.style.display = "inline"
      gagues.page2_text.txt = getNodesArray("#p2c_test", 6, pages.page2_text);

      gagues.page1.oil = getNodesArray("#p1_oil",4,pages.page1)
      gagues.page1.water = getNodesArray("#p1_water",6,pages.page1)
      gagues.page1.boost = getNodesArray("#p1_boost",4,pages.page1)
      gagues.page1.fuel = getNodesArray("#p1_fuel",6,pages.page1)
      gagues.page1.time = hu("#time_val",pages.page1)
      gagues.page1.temp_value = hu("#temp_va",pages.page1)
      gagues.page1.temp_unit = hu("#temp_unit",pages.page1)

      gagues.page2.oil = getNodesArray("#p2_oil",9,pages.page2)
      gagues.page2.fuel = getNodesArray("#p2_fuel",9,pages.page2)

      gagues.page2_gmeter.accelerometerMarker = hu("#gmeter_marker", pages.page2_gmeter);
      gagues.page2_gmeter.gXPositive = hu("#gmeter_R_val", pages.page2_gmeter);
      gagues.page2_gmeter.gXNegative = hu("#gmeter_L_val", pages.page2_gmeter);
      gagues.page2_gmeter.gYNegative = hu("#gmeter_B_val", pages.page2_gmeter);
      gagues.page2_gmeter.gYPositive = hu("#gmeter_F_val", pages.page2_gmeter);

      gagues.page2_tires_pres.pressureUnit = hu("#pressure_unit", pages.page2_tires);
      gagues.page2_tires_pres.RR = hu("#tpres_RR", pages.page2_tires);
      gagues.page2_tires_pres.FR = hu("#tpres_FR", pages.page2_tires);
      gagues.page2_tires_pres.RL = hu("#tpres_RL", pages.page2_tires);
      gagues.page2_tires_pres.FL = hu("#tpres_FL", pages.page2_tires);
      gagues.page2_tires_term.RR = hu("#ttemp_RR", pages.page2_tires);
      gagues.page2_tires_term.FR = hu("#ttemp_FR", pages.page2_tires);
      gagues.page2_tires_term.RL = hu("#ttemp_RL", pages.page2_tires);
      gagues.page2_tires_term.FL = hu("#ttemp_FL", pages.page2_tires);

      ready = true;
      $window.setPage("")
      $window.setTireTemperature({FL:"#fff",FR:"#fff",RL:"#fff",RR:"#fff"})
    }

    function updateGearIndicator(data) {
      // only update when gear is changed
      if (currentGear !== data.electrics.gear) {
        currentGear = data.electrics.gear;
        if(isNaN(data.electrics.gear)){//auto,DCT
            speedoDisplay.gears.text(data.electrics.gear);
        }else{//manuel
          switch(data.electrics.gear){
            case -1:
              speedoDisplay.gears.text("R");
              break;
            case 0:
              speedoDisplay.gears.text("N");
              break;
            default:
              speedoDisplay.gears.text(data.electrics.gear);
              break;
          }
        }
      }
    }

    function limitVal(min, val,max){
      return Math.min(Math.max(min,val), max);
    }
    function map_range(value, low1, high1, low2, high2) {
      return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    const clamp_remap = (val, min,max) => map_range(clamp(val,min,max), min,max,0,1);

    //https://stackoverflow.com/a/39077686
    const hexToRgb = hex =>
      hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
                ,(m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16))
    const rgbParse = rgbStr => rgbStr.replace(/[^\d,]/g, '').split(',').map(Number);

    function updateTachoDisplays(data) {
      if (ready) {
        //106deg
        let angle = limitVal(-5000, data["electrics"]["rpmTacho"]-5000 , 5000) * 0.0212
        tacho.needle.n.style["transform"] = 'rotate('+angle+'deg)'
      }
    }

    function updateAccelerometer(data) {
      gagues.page2_gmeter.accelerometerMarker.css({transformOrigin: '50% 50%', transform: `translate(${limitVal(-12,data.customModules.accelerationData.xSmooth,12)*1}px, ${-limitVal(-12,data.customModules.accelerationData.ySmooth,12)*1}px`})
      var roundedGX2 = (data.customModules.accelerationData.xSmooth / 10).toFixed(1);
      var roundedGY2 = (-data.customModules.accelerationData.ySmooth / 10).toFixed(1);
      gagues.page2_gmeter.gXPositive.text(roundedGX2 > 0 ? roundedGX2  : 0)
      gagues.page2_gmeter.gXNegative.text(roundedGX2 < 0 ? -roundedGX2 : 0)
      gagues.page2_gmeter.gYNegative.text(roundedGY2 > 0 ? roundedGY2  : 0)
      gagues.page2_gmeter.gYPositive.text(roundedGY2 < 0 ? -roundedGY2 : 0)
    }


    function updateSpeedDisplays(data) {
      if (ready) {
        speedoDisplay.speedValue.text((data.electrics.wheelspeed*unitspeedConv).toFixed(0))
      }
    }

    function updateGagues(data) {
      if (ready) {
        let remaped = clamp_remap(data.electrics.watertemp,60,120)
        for(let i=0;i<gagues.page1.water.length;i++){
          let threadshold = (i+0.5)/gagues.page1.water.length
          if(i==0)
            gagues.page1.water[i].css({"fill": (remaped>threadshold)?"#0058ff":"#323232"})
          else {
            if(i==5)
              gagues.page1.water[i].css({"fill": (remaped>threadshold)?"#f00":"#323232"})
            else
              gagues.page1.water[i].css({"fill": (remaped>threadshold)?"#fff":"#323232"})
          }
        }

        remaped = clamp_remap(data.electrics.oiltemp,60,130)
        for(let i=0;i<gagues.page1.oil.length;i++){
          let threadshold = (i+0.5)/gagues.page1.oil.length
          if(i==3)
            gagues.page1.oil[i].css({"fill": (remaped>threadshold)?"#f00":"#323232"})
          else
            gagues.page1.oil[i].css({"fill": (remaped>threadshold)?"#fff":"#323232"})
        }
        for(let i=0;i<gagues.page2.oil.length;i++){
          let threadshold = (i+0.5)/gagues.page2.oil.length
          if(i==0)
            gagues.page2.oil[i].css({"fill": (remaped>threadshold)?"#0058ff":"#323232"})
          else {
            if(i==8)
              gagues.page2.oil[i].css({"fill": (remaped>threadshold)?"#f00":"#323232"})
            else
              gagues.page2.oil[i].css({"fill": (remaped>threadshold)?"#fff":"#323232"})
          }
        }

        for(let i=0;i<gagues.page1.fuel.length;i++){
          let threadshold = (i+0.5)/gagues.page1.fuel.length
          if(i==0)
            gagues.page1.fuel[i].css({"fill": (data.electrics.fuel>threadshold)?"#f00":"#323232"})
          else
            gagues.page1.fuel[i].css({"fill": (data.electrics.fuel>threadshold)?"#fff":"#323232"})
        }
        for(let i=0;i<gagues.page2.fuel.length;i++){
          let threadshold = (i+0.5)/gagues.page2.fuel.length
          if(i==0)
            gagues.page2.fuel[i].css({"fill": (data.electrics.fuel>threadshold)?"#f00":"#323232"})
          else
            gagues.page2.fuel[i].css({"fill": (data.electrics.fuel>threadshold)?"#fff":"#323232"})
        }

        remaped = clamp_remap(data.electrics.turboBoost,0,6)
        for(let i=0;i<gagues.page1.boost.length;i++){
          let threadshold = (i+0.5)/gagues.page1.boost.length
          if(i==3)
            gagues.page1.boost[i].css({"fill": (remaped>threadshold)?"#f00":"#323232"})
          else
            gagues.page1.boost[i].css({"fill": (remaped>threadshold)?"#fff":"#323232"})
        }
      }
    }

    // overwriting plain javascript function so we can access from within the controller
    $window.setup = (data) => {
      if(!ready){
        console.log("calling setup while svg not fully loaded");
        setTimeout(function(){ $window.setup(data) }, 100);
        return;
      }

      //console.log("setup",data);
      for(let dk in data){
        if(typeof dk == "string" && dk.startsWith("uiUnit")){
          units[dk] = data[dk];
        }
      }
      vueEventBus.emit('SettingsChanged', {values:units})

      if(units.uiUnitLength == "metric"){
        speedoDisplay.speedUnit.text("KMH");
        unitspeedConv = 3.6;
      }
      else{
        speedoDisplay.speedUnit.text("MPH");
        unitspeedConv = 2.23694;
      }
      gagues.page1.temp_unit.text(UiUnits.temperature(0).unit)
      gagues.page2_tires_pres.pressureUnit.text(UiUnits.pressure(0).unit)
    }

    function setElec(node, state, key){
      if( node === undefined || node === null){console.error("setElec: svg element not found", key); return;}
      if( state === undefined || state === null){console.error("setElec: state not found", key);node.n.style.display = "none"; return;}
      node.n.style.filter = (state===true || state>0.1)?"":"url(#off)";
      //node.n.setAttribute("opacity", (state || state>0.1)?1.0:0.3)
    }

    $window.updateElectrics = (data) => {
      for(var k in electrics.lights){
        setElec(electrics.lights[k], data.electrics[k], k);
      }

      electrics.lights_lights.n.style.display = (data.electrics.lights>0.5&&data.electrics.lights<1.5)?"inline":"none";
      electrics.lights_highbeam.n.style.display = (data.electrics.lights>0.5&&data.electrics.lights<1.5)?"none":"inline";
      electrics.lights_highbeam.n.style.filter = (data.electrics.lights>1)?"":"url(#off)";

      electrics.lights_battery.n.style.filter = (data.electrics.engineRunning<0.1)?"":"url(#off)";

      if(cachedPage.page2 == "text"){
        let tmp = UiUnits.temperature(data.electrics.oiltemp)
        gagues.page2_text.txt[0].text(tmp.val.toFixed(0) + tmp.unit)
        tmp = UiUnits.temperature(data.electrics.watertemp)
        gagues.page2_text.txt[1].text(tmp.val.toFixed(0) + tmp.unit)
        tmp = UiUnits.temperature(data.customModules.environmentData.temperatureEnv)
        gagues.page2_text.txt[2].text(tmp.val.toFixed(0) + tmp.unit)

        tmp = UiUnits.consumptionRate(data.customModules.combustionEngineData.averageFuelConsumption * 1e-5)
        if(tmp.val == 'n/a')
          gagues.page2_text.txt[3].text(tmp.val + tmp.unit)
        else
          gagues.page2_text.txt[3].text(tmp.val.toFixed(0) + tmp.unit)
        tmp = UiUnits.consumptionRate(data.customModules.combustionEngineData.currentFuelConsumption * 1e-5)
        if(tmp.val == 'n/a' || data.electrics.wheelspeed < 4)
          gagues.page2_text.txt[5].text('---' + tmp.unit)
        else
          gagues.page2_text.txt[5].text(tmp.val.toFixed(0) + tmp.unit)

        tmp = UiUnits.distance(data.customModules.combustionEngineData.remainingRange*1000)
        if(data.customModules.combustionEngineData.remainingRange < 5)
          gagues.page2_text.txt[4].text("---")
        else
          gagues.page2_text.txt[4].text(tmp.val.toFixed(0) + tmp.unit)
      }

      electrics.dse.esc.css({animation:(data.electrics.escActive===true)?"blinkGreyFill 0.4s steps(2) infinite":""})
      electrics.dse.tcs.css({animation:(data.electrics.tcsActive===true)?"blinkGreyFill 0.4s steps(2) infinite":""})
      if(data.electrics.odometer){
        let val = data.electrics.odometer
        val *= (units.uiUnitLength=="metric")?0.001:0.0006215;
        val = Math.min(999999,val);
        electrics.odo_txt.text( val.toFixed(0)+" "+((units.uiUnitLength=="metric")?"km":"mi") )
      }
    }

    //https://stackoverflow.com/a/56266358
    function isColor(strColor){
      var s = new Option().style;
      s.color = strColor;
      return s.color !== "";
    }

    $window.updateMode = (data) => {
      if(!ready){
        console.log("calling updateMode while svg not fully loaded");
        setTimeout(function(){ $window.updateMode(data) }, 100);
        return;
      }
      //error checking because we can't trust people we work with
      /*if(data === null
      || data === undefined
      || data.modeName === null
      || data.modeName === undefined
      || typeof data.modeName !== "string"
      || data.modeColor === null
      || data.modeColor === undefined
      || typeof data.modeColor !== "string"){
        console.error("updateMode receive wrong arguments :", data);
        document.getElementById("layer_wip").style.display = "inline";
        document.getElementById("tspan995").innerHTML = "MODE";
        return;
      }
      if(!isColor(data.modeColor)){
        console.error("This mode color is not in html format :",data.modeColor)
        document.getElementById("layer_wip").style.display = "inline";
        document.getElementById("tspan995").innerHTML = "COL";
        return;
      }*/

      //hex color without # works in html but not in svg BECAUSE
      let s = new Option().style;
      s.color = data.modeColor;
      data.modeColor = s.color;

      electrics.mode_txt.text(data.modeName).css({"fill": data.modeColor});

      let rgb = rgbParse(data.modeColor)
      electrics.backgroundFilter.attr({values: (rgb[0]/255).toFixed(2)+" 0 0 0 0 0 "+(rgb[1]/255).toFixed(2)+" 0 0 0 0 0 "+(rgb[2]/255).toFixed(2)+" 0 0 0 0 0 1 0"})

      $window.setPage(data.page)
      $window.setDSELights(data.dseLights)
    }

    $window.updateData = (data) => {
      if (data) {
        if(!ready){console.log("not ready");return;}
         //console.log(data);

        // Update PRNDS display
        updateGearIndicator(data);
        // Update Speed displays
        updateSpeedDisplays(data);
        updateTachoDisplays(data);

        updateElectrics(data);
        updateGagues(data);

        $window.setRpmMarker(data.customModules.dynamicRedlineData)
        $window.setTirePressure(data.customModules.tireData.pressures)
        if(data.customModules.tireData.temperatures)
          $window.setTireTemperature(data.customModules.tireData.temperatures)

        if (pages.page2_gmeter.n.style.display === "inline" && cachedPage.page2=="gmeter") {
          updateAccelerometer(data);
        }

        if(cachedPage.page1){
          gagues.page1.time.text(data.customModules.environmentData.time)
          gagues.page1.temp_value.text(UiUnits.temperature(data.customModules.environmentData.temperatureEnv).val.toFixed(0))
        }

      }
    }

    $window.setPage = (data) => {
      if(!ready){
        console.log("calling setPage while svg not fully loaded");
        setTimeout(function(){ $window.setup(data) }, 100);
        return;
      }
      let newPage = {page1:(data=="time"), page2:false}
      if(!newPage.page1)
        newPage.page2 = data
      if(cachedPage == newPage){
        console.log("cached again")
        // return
      }

      // pages.page1.n.style.display = (!data.gmeter && !data.tires)?"inline":"none";
      // pages.page2_gmeter.n.style.display = (data.gmeter)?"inline":"none";
      // pages.page2_tires.n.style.display = (data.tires)?"inline":"none";
      // pages.page2_common.n.style.display = (data.gmeter || data.tires)?"inline":"none";
      // pages.page2_common.n.style

      pages.page1.n.style.animation = newPage.page1?"fadein 0.5s forwards":"fadeout 0.5s forwards";
      pages.page2_gmeter.n.style.animation = (newPage.page2=="gmeter")?"fadein 0.5s forwards":"fadeout 0.5s forwards";
      pages.page2_tires.n.style.animation = (newPage.page2=="tires")?"fadein 0.5s forwards":"fadeout 0.5s forwards";
      pages.page2_text.n.style.animation = (newPage.page2=="text")?"fadein 0.5s forwards":"fadeout 0.5s forwards";

      pages.page_R.css({transform: (newPage.page2!==false)?"translateY(-5.5px)":"translateY(3px)"});
      pages.page_R_odo.css({transform: (newPage.page2!==false)?"":"translateX(8px)"});

      if ((newPage.page2!==false) /*&& ! pages.page2_common.n.classList.contains('botIn')*/ ){
        pages.page2_common.n.classList.add('botIn')
        pages.page2_common.n.classList.remove('botOut')
      }
      else{
        pages.page2_common.n.classList.remove('botIn')
        pages.page2_common.n.classList.add('botOut')
      }
      cachedPage = newPage
    }

    $window.setTirePressure = (data) => {
      if(!data||!ready)return;

      for(let d in data){
        let val = UiUnits.pressure(data[d] , units["unitPressure"])
        gagues.page2_tires_pres[d].text(val.val.toFixed((val.val<10)?1:0))
      }
    }

    $window.setTireTemperature = (data) => {
      if(!data||!ready)return;

      for(let d in data){
        gagues.page2_tires_term[d].css({fill: data[d]})
      }
    }

    $window.setRpmMarker = (data) => {
      if(!ready){
        console.log("calling setRpmMarker while svg not fully loaded");
        setTimeout(function(){ $window.setup(data) }, 100);
        return;
      }
      if(!data)return;

      //tacho.markers_root.css({filter:(data.shiftLight)?"url(#filterRedline)":""})
      //tacho.markers_root.css({animation:(data.shiftLight)?"blinkRedLine 0.25s linear infinite":""})

      for(let i=0;i<tacho.markers.length;i++){
        if(i>= data.red)
          tacho.markers[i].css({stroke:"#f00",animation:(data.shiftLight)?"blinkRedLine 0.25s linear infinite":""})
        else{
          if(i<data.yellow)
            tacho.markers[i].css({stroke:"#fff", animation:(data.shiftLight)?"blinkRedLine 0.25s linear infinite":""})
          else
            tacho.markers[i].css({stroke:"#ffd700", animation:(data.shiftLight)?"blinkRedLine 0.25s linear infinite":""})
        }
      }
    }

    $window.setDSELights = (data) => {
      if(!data)return;
      if(!ready){
        console.log("calling setDSELights while svg not fully loaded");
        setTimeout(function(){ $window.setup(data) }, 100);
        return;
      }

      if(data.esc)
        electrics.dse.esc.css({fill:data.esc})
      if(data.tcs)
        electrics.dse.tcs.css({fill:data.tcs})
      if(data.powertrain)
        electrics.dse.pwrtrain.css({stroke:data.powertrain})
      if(data.suspension)
        electrics.dse.sus.css({stroke:data.suspension})
      //{esc:"#fff",tcs:"#fff",powertrain:"#fff",suspension:"#fff"}
    }


    let demoStep = 0;

    function getRndFloat(min, max) {
      return Math.random() * (max - min) + min;
    }

    function getRndColor() {
      return "#" + Math.floor(Math.random()*16777215).toString(16);;
    }

    function demo(){
      switch(demoStep){
        case 0:
          setPage("time");
          break;
        case 1:
          setPage("gmeter");
          break;
        case 2:
          setPage("tires");
          break;
        case 3:
          setPage("text");
          break;
        case 4:
          setPage("nope");
          break;
      }

      demoStep = (demoStep+1)%4
      demoStep=0

      setRpmMarker({yellow:16,red:18,redLine:(Math.random()>0.5 && false)})
      setTirePressure({FL:Math.random(),FR:Math.random(),RL:Math.random(),RR:Math.random()})
      //setDSELights({esc:getRndColor(),tcs:getRndColor(),powertrain:getRndColor(),suspension:getRndColor()})

      updateData({electrics: {lowfuel: Math.random()>0.5, fuel: Math.random(), watertemp: getRndInteger(40,130), rpmTacho: getRndInteger(0,10000),oiltemp:getRndInteger(40,130), turboBoost:getRndFloat(0,5), engineRunning:Math.random()*0.2, odometer:Math.random()*50000000,
        signal_L:Math.random(), signal_R:Math.random(), lights:Math.random()*2, highbeam:Math.random(), lowpressure:Math.random(), parkingbrake:Math.random(), checkengine:Math.random(), gear:"M2", wheelspeed: getRndInteger(0,400)/3.6, escActive:true, tcsActive:true },
        customModules: {
          accelerationData: {xSmooth:getRndFloat(-20,20) ,ySmooth:getRndFloat(-20,20)},
          environmentData:{time:getRndInteger(0,23)+":"+getRndInteger(0,59), temperatureEnv:Math.random()*100-50},
          dynamicRedlineData:{yellow:12,red:14,shiftLight:false},
          tireData:{
            pressures:{FL:Math.random()*200,FR:Math.random()*200,RL:Math.random()*200,RR:Math.random()*200},
            temperatures:{FL:getRndColor(),FR:getRndColor(),RL:getRndColor(),RR:getRndColor()}
          },
          combustionEngineData:{fuelDisplay:Math.random()*50,averageFuelConsumption:Math.random()*50,currentFuelConsumption:Math.random()*50,remainingRange:Math.random()*200}
        }});

      setTimeout(demo, 2000);
    }
    if(typeof beamng == 'undefined' || typeof beamng.sendActiveObjectLua == 'undefined') { //mode demo only in external browser
      console.log("Demo mode")
      setTimeout(()=>{
        setDSELights({esc:getRndColor(),tcs:getRndColor(),powertrain:getRndColor(),suspension:getRndColor()})
        updateMode({modeName:"TEST DEMO", modeColor:"#F60"});
        demo()
      }, 500);
    }
    //ready = true;
  });
