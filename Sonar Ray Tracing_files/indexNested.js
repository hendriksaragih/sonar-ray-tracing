/*=============================================================
  Filename: indexNested-23.js

  Support code for web site nested menu items

  Date    Description                                       By
  -------|-------------------------------------------------|---
  03Sep17 First release                                     ARC
  12Aug19 Added Spectrogram Display                         ARC
  29Feb20 Added Cango Animation User Guide                  ARC
  05May20 Rename Canvas3DManual to Cango3DManual            ARC
  13Jul20 Added Cango Text Utils User Guide                 ARC
  29Jul20 Added Astronomical Clock                          ARC
  16Jul21 Moved SVGpathUtils to Cango Graphics pages        ARC
  03Seo21 Added BitArray Utils User Guide                   ARC
  23Sep21 Changed SVGpathUtilities to PathSVGUserGuide      ARC
  02Dec21 Added TravelingWave page                          ARC
  20Apr22 Added CangoArrowManual page                       ARC
  12Jun23 Added Cango3DTransforms page                      ARC
  12Jun23 Added Rotating Globe page                         ARC
  09Jul24 Added Zoom-n-Pan User Guide page                  ARC
  23Feb25 Added MatrixTransforms page                       ARC
 ==============================================================*/

 var indexData = [
  {title:"CALENDARS", url:"Calendar.html",
    chapters:[
    {title:"Historical Calendar", url:"Calendar.html"},
    {title:"Astronomical Clock", url:"AstronomicalClock.html"}
               ]
  },
  {title:"Cango GRAPHICS", url:"CangoGraphics.html",
    chapters:[
    {title:"Cango User Guide", url:"CangoGraphics.html"},
    {title:"Cango Animation User Guide", url:"CangoAnimationManual.html"},
    {title:"Cango Axes User Guide", url:"CangoAxesManual.html"},
    {title:"Cango Text Utils User Guide", url:"CangoTextUtilsManual.html"},
    {title:"Cango Arrows User Guide", url:"CangoArrowsManual.html"},
    {title:"Cango Zoom-Pan User Guide", url:"CangoZoomPanManual.html"},
    {title:"PathSVG User Guide", url:"PathSVGUserGuide.html"}
               ]
  },
  {title:"Canvas TECH DRAWING", url:"#",
    chapters:[
    {title:"Travelling Wave Animation", url:"TravellingWaves.html"},
    {title:"Screw Thread Drawing", url:"ThreadDrawing.html"},
    {title:"Helix Drawing", url:"HelixDrawing.html"},
    {title:"Involute Gear Drawing", url:"GearDrawing.html"}
               ]
  },
  {title:"Cango3D GRAPHICS", url:"#",
    chapters:[
    {title:"Cango3D User Guide", url:"Cango3DUserGuide.html"},
    {title:"Cango3D Extensions User Guide", url:"Cango3DExtensionsManual.html"},
    {title:"Cango3D Animation User Guide", url:"Cango3DAnimationManual.html"},
    {title:"Cango3D Transforms", url:"Cango3DTransforms.html"},
    {title:"3D Graph Plotting", url:"3DGraphPlotting.html"},
    {title:"3D Rotating Globe", url:"RotatingGlobe.html"}
               ]
  },
  {title:"HISTORIC ORDNANCE", url:"#",
    chapters:[
  {title:"Royal Ordnance 1637", url:"Ordnance1637.html"},
  {title:"British Cannon Design", url:"Cannon.html"},
  {title:"Armstrong Pattern Guns", url:"ArmstrongPattern.html"},
  {title:"Cannonball Sizes", url:"Cannonballs.html"},
  {title:"Cannonball Aerodynamic Drag", url:"CannonballDrag.html"},
  {title:"Smooth Bore Cannon Ballistics", url:"CannonBallistics.html"},
  {title:"Robins On Ballistics", url:"RobinsOnBallistics.html"},
  {title:"Flintlock Animation", url:"Flintlock.html"},
  {title:"Wheellock Animation", url:"Wheellock.html"}
               ]
  },
  {title:"JavaScript Utilities", url:"#",
    chapters:[
    {title:"Javascript Animation", url:"JsAnimation.html"},
    {title:"Canvas Layers", url:"CanvasLayers.html"},
    {title:"Javascript Xeyes", url:"XEyes.html"},
    {title:"Sphere Shading with CSS", url:"SphereShading.html"},
    {title:"BitArray User Guide", url:"BitArrayManual.html"},
    {title:"Matrix Transforms", url:"MatrixTransforms.html"}
               ]
  },
  {title:"SIGNAL PROCESSING", url:"#",
    chapters:[
    {title:"Spectrum Analyser", url:"SpectrumAnalyser.html"},
    {title:"FIR Filter Design", url:"FilterDesign.html"},
    {title:"Spectrogram Display", url:"Spectrogram.html"},
    {title:"Zoom FFT", url:"ZoomFFT.html"}
               ]
  },
  {title:"UNDERWATER ACOUSTICS", url:"#",
    chapters:[
    {title:"Underwater Sound Propagation", url:"UWAcoustics.html"},
    {title:"Sonar Ray Tracing", url:"SonarRayTracing.html"},
    {title:"Sound Pressure Levels", url:"SoundLevels.html"}
    ]
  }
];

/* -------------------------------------------------------------------------
  * buildMenu(dataArray)
  *
  * dataArray should be in JSON format as follows
  * [ {title:"String to display in index", url:"url of file"},
  *   {title:"String to display in index", url:"url of file",
  *    "chapters": [
  *       {title:"String to display in index", url:"url of file"},
  *       {title:"String to display in index", url:"url of file"},
  *       ...
  *       {title:"String to display in index", url:"url of file"}
  *     ]
  *   },
  *   {title:"String to display in index", url:"url of file"},
  *   ...
  * ]
  * Then build HTML anchors from the array.
  *--------------------------------------------------------------------------*/
function buildMenu(dataArray)
{
  var menuNode = document.getElementById("sideNav"),
      htmlStr = "",
      currPage,
      i;

  function subStringReplaceAt(str, index, newSubStr, oldSubStrLength)
  {
    return str.slice(0, index) + newSubStr + str.slice(index+oldSubStrLength);
  }

  function parseAry(obj)
  {
    const currPage = document.URL.replace(/^.*[\\\/]/, '');   // split off the page name (cross platform)

    for (let i=0; i<obj.length; i++)
    {
      if (obj[i].chapters)
      {
        htmlStr += "<ul>";
        htmlStr += `<li class='sectClosed'><input type='button' onclick='toggleSection(this)' value='${obj[i].title}'><ul class='options'>`;
        parseAry(obj[i].chapters);
        htmlStr += "</ul></li>";
      }
      else
      {
        htmlStr += "<li><a href='"+obj[i].url+"' target='_top'>"+obj[i].title+"</a></li>";
        // check if this index entry is the current page, if open this section to show link
        if (currPage == obj[i].url)
        {
          htmlStr = subStringReplaceAt(htmlStr, htmlStr.lastIndexOf("sectClosed"), "sectOpen", 10);
        }
      }
    }
    htmlStr += "</ul>";
  }

  parseAry(dataArray);
  menuNode.innerHTML = htmlStr;
}

function buildLocalMenu(dataArray)
{
  const menuNode = document.getElementById("sideNav");
  let htmlStr = `<ul><li class='itemClosed'><input type='button' onclick='buildMenu(indexData)' value='Main Menu'></li><ul>`;

  function subStringReplaceAt(str, index, newSubStr, oldSubStrLength)
  {
    return str.slice(0, index) + newSubStr + str.slice(index+oldSubStrLength);
  }

  function parseAry(obj)
  {
    const currPage = document.URL.replace(/^.*[\\\/]/, '');   // split off the page name (cross platform)
    for (let i=0; i<obj.length; i++)
    {
      if (obj[i].chapters)
      {
        htmlStr += "<ul>";
          htmlStr += `<li class='itemOpen'><input class='item' type='button' onclick='toggleSection(this)' value='${obj[i].title}'><ul class='options'>`;
        parseAry(obj[i].chapters);
        htmlStr += "</ul></li>";
      }
      else
      {
        htmlStr += `<li><a class='live' href='${obj[i].url}'>&nbsp;&nbsp;${obj[i].title}</a></li>`;
        // check if this index entry is the current page, if open this section to show link
        if (currPage == obj[i].url)
        {
          htmlStr = subStringReplaceAt(htmlStr, htmlStr.lastIndexOf("itemClosed"), "itemOpen", 10);
        }
      }
    }
  }
  parseAry(dataArray);
  menuNode.innerHTML = htmlStr;
}

function toggleSection(btn)
{
  if (btn && btn.parentNode.className === "sectClosed")
  {
    btn.parentNode.className = "sectOpen";
  }
  else if (btn && btn.parentNode.className === "sectOpen")
  {
    btn.parentNode.className = "sectClosed";
  }
  if (btn && btn.parentNode.className === "itemClosed")
  {
    btn.parentNode.className = "itemOpen";
  }
  else if (btn && btn.parentNode.className === "itemOpen")
  {
    btn.parentNode.className = "itemClosed";
  }
  return false;   // is used with anchor will prevent going to href
}
