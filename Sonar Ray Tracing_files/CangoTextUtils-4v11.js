/*===================================================================
  Filename: CangoTextUtils-4v11.js
  Rev 4
  By: Dr A.R.Collins

  Requires Cango-26 or greater
  Description: 
  Adds these global objects
    HTMLText
    VectorText
    TextOnPath
  Adds these drawing methods to Cango core:
    drawHTMLText
    drawMathTest
    drawVectorText
    drawSciNotationText 
    drawTextOnPath

  License: Released into the public domain
  link to latest version at
  <http://www/arc.id.au/CangoTextUtils.html>
  Report bugs to tony(at)arc.id.au

  Date    Description                                            |By
  -------------------------------------------------------------------
  12Jul20 Released as CangoTextUtils-1v00                         ARC
  14Jul20 Added bgFillColor support to drawHTMLText               ARC
  15Jul20 Apply sciNotion transforms in insertion order           ARC
  16Jul20 Set ovlHTML position:relative to keep in the layout     ARC
  14Jun21 Upgrade to use Cango-22 with new default property names ARC
  20Jun21 Simplified wrapper fn, no parameter no return value     ARC
  04Jul21 drawTextOnPath corrects for nonIsoScl not SVGsegs.track ARC
  08Jul21 Use getPointAtLength not distToPos                      ARC
  21Aug21 Added global class TextOnPath                           ARC
  12Sep21 Replace drawHTMLtext using <div> with canvas Img object ARC
  13Sep21 Added drawMathText using Google chart to Img object     ARC
  14Sep21 Fixed the drawHTMLText width,imgWidth priority          ARC
  15Sep21 Use codecogs for drawMathText rendering                 ARC
  15Sep21 Released as CangoTextUtils-3v00                         ARC
  23Sep21 Update to use PathSVG rather than SVGsegs               ARC
  05Mar22 Update to use Cango 26 with extension Objects           ARC
  05Apr22 Allow fontSize set by pixels to zoom                    ARC
  08Apr22 Update to use setStyleProperty and addTransformProperty ARC
  12Apr22 Released as CangoTextUtils-4v00                         ARC
  17Apr22 bugfix: sciNotation not showing "x10"                   ARC
  19Apr22 Refactor SciNotationText and add ExpNotationText        ARC
  21Feb23 bugfix: bad test for ExpNotationText                    ARC
  07May24 Use jqMath to parse MathText objects                    ARC
  27Dec24 bugfix: Chrome threw cross-origin error for SVG image   ARC  
  29Dec24 refactor HTMLText to eliminate async formatting         ARC
 ====================================================================*/

var HTMLText, MathText, ExpNotationText, SciNotationText, TextOnPath, VectorText;

(function()
{
  "use strict";
  const transforms = ["x", "y", "rot", "scl", "sclx", "scly", "skewx", "skewy"];

  HTMLText = class extends Group
  {
    constructor(txt, opts)
    {
      /*====================================================
        Note: Special characters:
        Most keyboard characters may be inserted unencoded 
        eg: !@#$%^*()_+[]{}|:;,./?
        special characters may be encoded with the unicode 
        eg: deg = \u00B0 alpha = \u03B1 | = \u007C etc
        The exceptions are & and < these must be encoded as 
        follows: & = \&amp; and < = \&lt;
        Other JavaScript encoded chars are not recognized
        eg. \&deg; or \&vert; throw an error.
      -----------------------------------------------------*/
      if (typeof txt !== "string")
      {
        console.warn("Type Error: Text descriptor argument not type String");
        return;
      }
      super();
      this.str = txt;
      this.fontSizeWC = undefined;   // world coords
      this.fontSize = 13;            // pixels
      this.fontFamily = "Consolas";
      this.color = "black";
      this.options = opts;

      if (typeof(this.str) !== "string" || !this.str.length)
      {
        console.warn("HTMLText error: no text specified");
        return;
      }

      this.setOptionProperty = (propertyName, value)=>
      {     
        if ((typeof propertyName !== "string")||(value === undefined))
        {
          return;
        }
      
        switch (propertyName.toLowerCase())
        {
          case "fillcolor":
            if (typeof value === "string")
            {
              this.color = value;
            }
            break;
          case "fontsize":
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSize = value;
            }
            break;
          case "fontsizewc": 
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSizeWC = value;
            }
            break;
          case "fontfamily":
            if (typeof value === "string")
            {
              this.fontFamily = value;
            }
            break;
          case "imgwidth":
            if (typeof value === "number")
            {
              this.imgWid = value;
            }
            break;
          case "imgheight":
            if (typeof value === "number")
            {
              this.imgHgt = value;
            }
            break;
          default:
            break;
        }
      };
              
      for (let prop in opts)
      {
        if (opts.hasOwnProperty(prop)) // own property, not inherited from prototype
        {
          this.setOptionProperty(prop, opts[prop]);
        }
      }
      // don't give the Group an Img child here or it will be the previous dimensions
      // and will be redrawn while waiting for the new one 
    }

    preRender(gc)
    {
      // Freeze the scale factor at first render value so that zoom works on Text
      if (!this.orgXscl) 
      {
        this.orgXscl = gc.xscl;
      }
      let fSize = this.fontSize;   // pixels
      if (this.fontSizeWC)
      {
        fSize = this.fontSizeWC*this.orgXscl;  // pixels
      }
      const zmScl = gc.xscl/this.orgXscl;

      const imgWidPX = (this.imgWid)? `${this.imgWid*gc.xscl*zmScl}px`: "auto";
      const imgHgtPX = (this.imgHgt)? `${this.imgHgt*gc.xscl*zmScl}px`: "auto";
      const container = document.createElement("div");
      container.style.width = imgWidPX;
      container.style.height = imgHgtPX;
      container.style.position = "absolute";
      container.style.fontFamily = `${this.fontFamily}`;
      container.style.fontSize = `${fSize*zmScl}px`;
      container.style.color = `${this.color}`;

      document.body.appendChild(container);
      // Set the text content
      container.innerHTML = `${this.str}`;

      const wid = container.clientWidth;
      const hgt = container.clientHeight;
      // Create a new XMLSerializer
      let serializer = new XMLSerializer();
      // Serialize the MathML in the div to a string
      let xmlStr = serializer.serializeToString(container);

      container.remove();

      // Create an SVG element with the MathML embedded in a foreignObject
      let iSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${wid}" height="${hgt}" color="${this.color}">
      <foreignObject width="100%" height="100%">
        ${xmlStr}
      </foreignObject>
      </svg>`;

      // Convert the SVG string to a Base64-encoded data URL
      const svgBase64 = btoa(unescape(encodeURIComponent(iSVG))); // Encode the SVG string
      const svgURL = `data:image/svg+xml;base64,${svgBase64}`;

      // Create a new Image object
      let imgDesc = new Image();
      // pass on any option properties
      const texImg = new Img(imgDesc, this.options);
      this.addObj(texImg);
      // start loading image
      imgDesc.src = svgURL;  
    }
  };

  MathText = class extends Group
  {
    constructor(latex, opts)
    {
      super();
      this.str = latex;
      this.fontSizeWC = undefined;   // world coords
      this.fontSize = 13;            // pixels
      this.fontFamily = "Consolas";
      this.color = "black";
      this.options = opts;

      if (typeof(this.str) !== "string" || !this.str.length)
      {
        console.warn("HTMLText error: no text specified");
        return;
      }

      this.setOptionProperty = (propertyName, value)=>
      {     
        if ((typeof propertyName !== "string")||(value === undefined))
        {
          return;
        }
      
        switch (propertyName.toLowerCase())
        {
          case "fillcolor":
            if (typeof value === "string")
            {
              this.color = value;
            }
            break;
          case "fontfamily":
            if (typeof value === "string")
            {
              this.fontFamily = value;
            }
            break;
          case "imgwidth":
            if (typeof value === "number")
            {
              this.imgWid = value;
            }
            break;
          case "imgheight":
            if (typeof value === "number")
            {
              this.imgHgt = value;
            }
            break;
          default:
            break;
        }
      };
      for (let prop in opts)
      {
        if (opts.hasOwnProperty(prop)) // own property, not inherited from prototype
        {
          this.setOptionProperty(prop, opts[prop]);
        }
      }
    }

    preRender(gc)
    {
        // Freeze the scale factor at first render value so that zoom works on Text
      if (!this.orgXscl) 
      {
        this.orgXscl = gc.xscl;
      }
      const zmScl = gc.xscl/this.orgXscl;

      const container = document.createElement("div");
      container.style.width = "auto";
      container.style.position = "absolute";
      container.style.fontFamily = `${this.fontFamily}`;
      container.style.color = `${this.color}`;
    
      document.body.appendChild(container);
      // Set the LaTeX content
      container.innerHTML = `$$ ${this.str} $$`;

      M.parseMath(container);  // jqMath parsing

      const wid = container.offsetWidth;
      const hgt = container.offsetHeight;
      // Create a new XMLSerializer
      let serializer = new XMLSerializer();
      // Serialize the MathML in the div to a string
      let mathmlStr = serializer.serializeToString(container);
      // strip the div container code
      mathmlStr = mathmlStr.substring(mathmlStr.indexOf(">") + 1).slice(0, -6);

      container.remove();

      // Create an SVG element with the MathML embedded in a foreignObject
      let iSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${wid*1.1}" height="${hgt*1.1}" color="${this.color}">
      <foreignObject width="100%" height="100%">
        ${mathmlStr}
      </foreignObject>
      </svg>`;

      // Convert the SVG string to a Base64-encoded data URL
      const svgBase64 = btoa(unescape(encodeURIComponent(iSVG))); // Encode the SVG string
      const svgURL = `data:image/svg+xml;base64,${svgBase64}`;

      // Create a new Image object
      let imgDesc = new Image();
      // pass on any option properties
      const texImg = new Img(imgDesc, this.options);
      this.addObj(texImg);
      // start loading image
      imgDesc.src = svgURL;
    }
    
  };
  
  ExpNotationText = class extends Group
  {
    constructor (man, exp, opts={})
    {
      if ((typeof(man) !== "number" && (typeof(man) !== "string")
          || typeof(exp) !== "number" && typeof(exp) !== "string"))   // man or exp == 0 is OK
      {
        console.warn("Type Error: ExpNotationText invalid mantissa or exponent");
        return new Group();
      }
      super();
      this.man = (typeof man === 'string')? man: man.toString();
      this.exp = (typeof exp === 'string')? exp: exp.toString(),
      this.fontSizeWC = undefined;   // world coords
      this.fontSize = 13;            // pixels
      this.fontFamily = "Consolas";
      this.fillColor = "black";
      this.bgFillColor = undefined;
      this.preText = "";
      this.postText = "";
      this.lorg = 7;        // set the default

      if (this.man == "0" || this.exp == "0") this.exp = "";

      let fntWgt = 400;    // default

      this.setOptionProperty = (propertyName, value)=>
      {
        const lorgVals = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        if ((typeof propertyName !== "string")||(value === undefined))
        {
          return;
        }
      
        switch (propertyName.toLowerCase())
        {
          case "pretext":
            if (typeof value === "string")
            {
              this.preText = value;
            }
            break;
          case "posttext":
            if (typeof value === "string")
            {
              this.postText = value;
            }
            break;
          case "color":
          case "fillcolor":
            if (typeof value === "string")
            {
              this.fillColor = value;
            }
            break;
          case "bgfillcolor":
            if (typeof value === "string")
            {
              this.bgFillColor = value;
            }
            break;
          case "fontsize":
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSize = value;
            }
            break;
          case "fontsizewc": 
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSizeWC = value;
            }
            break;
          case "fontweight":
            if ((typeof value === "string")||((typeof value === "number")&&(value>=100)&&(value<=900)))
            {
              fntWgt = value;
            }
            break;
          case "lorg":
            if (lorgVals.indexOf(value) !== -1)
            {
              this.lorg = value;
            }
            break;
          default:
            break;
        }
      };
              
      this.options = opts;   // get ready to pass on any transform properties
      for (let prop in opts)
      {
        if (opts.hasOwnProperty(prop)) // own property, not inherited from prototype
        {
          this.setOptionProperty(prop, opts[prop]);
        }
      }

      if (typeof(fntWgt) === "string")
      {
        switch (fntWgt)
        {
          default:
          case "normal":
          fntWgt = 400;
          break;
          case "bold":
          fntWgt = 700;
          break;
          case "bolder":
          fntWgt = 900;
          break;
          case "lighter":
          fntWgt = 200;
          break;
        }
      }
      this.fontWeight = fntWgt;

      if (this.preText.length)
      { 
        this.man = this.preText + this.man; 
      }
      if (this.bgFillColor)
      {
        this.bbox = new Shape(null, {fillColor:this.bgFillColor});
        this.addObj(this.bbox);
      }
      this.manObj = new Text(this.man, {fillColor:this.fillColor, fontFamily:this.fontFamily, fontWeight:this.fontWeight, lorg:7});
      this.addObj(this.manObj);
      if (this.exp.length)
      {
        this.expObj = new Text(this.exp, {fillColor:this.fillColor, fontFamily:this.fontFamily, fontWeight:this.fontWeight, lorg:7});
        this.addObj(this.expObj);
      }
      if (this.postText.length)
      {
        this.postTxtObj = new Text(this.postText, {fillColor:this.fillColor, fontFamily:this.fontFamily, fontWeight:this.fontWeight, lorg:7});
        this.addObj(this.postTxtObj);
      }
    } 
      
    preRender(gc)
    {
      function getTextWidth(txt, styleStr)
      {
        gc.ctx.save();
        gc.ctx.font = styleStr;
        let wid = gc.ctx.measureText(txt).width;  // width in pixels
        gc.ctx.restore();

        return wid;
      }

      if (!this.hardTfmApplied)
      {
        if (!this.orgXscl) 
        {
          this.orgXscl = gc.xscl;
        }
        const zoomScl = gc.xscl/this.orgXscl;
        const PX_to_isoWC = 1/gc.xscl;
        const PX_to_yWC = 1/gc.yscl;
        const isoWC_to_PX = gc.xscl;
        const yisoWC_to_WC = Math.abs(gc.yscl/gc.xscl);
        
        const fntWgt = this.fontWeight;
        const fntFm = this.fontFamily;
        let fntSz;  // pixels
        if (this.fontSizeWC)
        {
          fntSz = this.fontSizeWC*isoWC_to_PX;  // fontSize in zoomable pixels
        }
        else
        {
          fntSz = this.fontSize*zoomScl;        // fontSize in zoomable pixels        
        }
        // set the drawing context to measure the size
        const fntStyle = fntWgt+" "+fntSz+"px "+fntFm;
        const manWid = 1.05*getTextWidth(this.man, fntStyle)*PX_to_isoWC; // Text width in World Coords
        const manHgt = 1.1*fntSz*PX_to_isoWC;                   // Text height in World coords
        let wid = manWid;

        let expWid = 0;
        let expHgt = 0;
        if (this.expObj)
        {
          expWid = getTextWidth(this.exp, fntWgt+" "+0.7*fntSz+"px "+fntFm)*PX_to_isoWC;
          expHgt = 0.7*fntSz*PX_to_isoWC;
          wid += expWid;
        }
        let postWid = 0;
        if (this.postText.length)
        {
          postWid = 1.05*getTextWidth(this.postText, fntStyle)*PX_to_isoWC; // Text height in World coords
          wid += postWid;
        }

        const hgt = manHgt;  
        const wid2 = wid/2;
        const hgt2 = hgt/2;
        const lorgWC = [0, [0,  hgt], [wid2,  hgt], [wid,  hgt],
                          [0, hgt2], [wid2, hgt2], [wid, hgt2],
                          [0,    0], [wid2,    0], [wid,    0]];
        const lorgdx = -lorgWC[this.lorg][0]*yisoWC_to_WC;
        const lorgdy = -lorgWC[this.lorg][1]*yisoWC_to_WC;

        // save the width & height as a properties (used for axes label positioning)
        this.width = wid; 
        this.height = hgt;
      
        // mantissa bounding box
        const manBB = {ul: {x: 0, y: manHgt},
                      ll: {x: 0, y: 0},
                      lr: {x:manWid, y: 0},
                      ur: {x:manWid, y: manHgt}};   

        if (this.bbox)
        {
          // construct the SVG commands for the text bounding box (world coords)
          const bboxData = ["M", manBB.ll.x, manBB.ll.y, "l", 0, hgt*yisoWC_to_WC, "l", wid, 0, "l", 0, -hgt*yisoWC_to_WC, "z"]
          this.bbox.setDescriptor(bboxData);
          this.bbox.addTransformProperty("x", lorgdx);
          this.bbox.addTransformProperty("y", lorgdy);
        }
        
        // format the mantissa Object
        this.manObj.addTransformProperty("x", lorgdx);
        this.manObj.addTransformProperty("y", lorgdy); 
        this.manObj.setStyleProperty("fontSize", fntSz);   

        // format the exponent Object
        if (this.expObj)
        {
          this.expObj.addTransformProperty("x", manBB.ur.x + lorgdx); // shift exp to upper right of mantissa
          this.expObj.addTransformProperty("y", manBB.ur.y - expHgt + lorgdy);
          this.expObj.setStyleProperty("fontSize", 0.7*fntSz);
        }

        // format the postText object
        if (this.postTxtObj)
        {
          this.postTxtObj.addTransformProperty("x", manBB.lr.x+1.1*expWid + lorgdx); // shift postTxtObj to the right of the mantissa
          this.postTxtObj.addTransformProperty("y", manBB.lr.y-1*PX_to_yWC + lorgdy);
          this.postTxtObj.setStyleProperty("fontSize", fntSz);
        }

        // apply all the optional properties
        for (let prop in this.options)
        {
          this.addTransformProperty(prop, this.options[prop]);
        }
        this.hardTfmApplied = true;
      }
     }
  };

  SciNotationText = class extends ExpNotationText
  {
    constructor (val, opts={})
    {
      function toSciNotation(val, decPlcs=2)        // rounds to 2 dec places and strips trailing 0s
      {
        const retObj = {};
        const exp = Math.floor(Math.log(Math.abs(val))/Math.LN10);  // alow exponent over-ride
        const man = val/Math.pow(10.0, exp);

        // now force round to decPlaces
        let manStr = man.toFixed(decPlcs);
        // now strip trailing 0s
        while (manStr.charAt(manStr.length-1) === '0')
        {
          manStr = manStr.substring(0, manStr.length-1);
        }
        if (manStr.charAt(manStr.length-1) === '.')  // don't end with decimal point
        {
          manStr = manStr.substring(0, manStr.length-1);
        }
      
        retObj.man = parseFloat(manStr);
        retObj.manStr = manStr;
        retObj.exp = exp;
        retObj.expStr = exp.toString();

        return retObj;
      }

      if ((typeof(val) !== "number" && typeof(val) !== "string")  // string or number OK
        || typeof(opts) == "number" || typeof(opts) == "string") // check only 1 data argument 
      {
        console.warn("Type Error: SciNotationText invalid argument");
        return new Group();
      }
      let decPlcs = 2;
      for (let prop in opts)
      {
        if (opts.hasOwnProperty(prop)) // own property, not inherited from prototype
        {
          const value = opts[prop];
          if (prop.toLowerCase() === "decplaces" && typeof value === "number" && value >= 0)
          {
            decPlcs = value;
          }
        }
      }
      const valObj = toSciNotation(val, decPlcs);

      super(valObj.manStr, valObj.expStr, opts);

      if (this.exp.length)
      {
        this.man += "\u00d710";   // Note: \u00d7 is the "times" sign
      }
      this.manObj.setDescriptor(this.man);
    }
  };

  TextOnPath = class extends Group
  {
    constructor(str, pathData, opts={}) {
      super();
      this.str = str;
      this.pathIso = false;
      this.offset = 0;      // percentage of total track length to first char
      this.fontSizeWC = undefined;   // world coords
      this.fontSize = 13;            // pixels
      this.charSpacing = undefined;  // pixels
      this.options = opts;

      if (pathData instanceof PathSVG)
      {
        this.pth = pathData;
      }
      else
      {
        this.pth = new PathSVG(pathData);
      }
      if (!(this.pth instanceof PathSVG && this.pth.length))
      {
        console.log("TextOnPath: path descriptor has length 0")
        return;
      }
      if (!(typeof this.str === "string" && this.str.length)) 
      {
        console.warn("TextOnPath: no text specified");
        return;
      }

      this.options = opts;   // save the options for preRender
      for (let prop in opts)
      {
        if (opts.hasOwnProperty(prop)) // own property, not inherited from prototype
        {
          this.setOptionProperty(prop, opts[prop]);
        }
      }
    }
    
    setOptionProperty(propertyName, value) {     
        if ((typeof propertyName !== "string")||(value === undefined))
        {
          return;
        }
      
        switch (propertyName.toLowerCase())
        {
          case "offset":
            this.offset = value;
            break;
          case "charspacing":
            this.charSpacing = value;
            break;
          case "iso":
            this.pathIso = (value === true || value  === "iso" || value == "isotropic");
            break;
          case "fontsize":
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSize = value;
            }
            break;
          case "fontsizewc": 
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSizeWC = value;
            }
            break;
          default:
            break;
      }
    }
    
    preRender(gc) {
      // Freeze the scale factor at first render value so that zoom works on Text
      if (!this.orgXscl) 
      {
        this.orgXscl = gc.xscl;
      }
      const zoomScl = gc.xscl/this.orgXscl;
      const PX_to_isoWC = 1/gc.xscl;
      const isoWC_to_PX = gc.xscl;
      const yisoWC_to_WC = Math.abs(gc.yscl/gc.xscl);
      const yWC_to_isoWC = Math.abs(gc.xscl/gc.yscl);

      let fSize;   // pixels
      if (this.fontSizeWC)  // in isoWC
      {
        fSize = this.fontSizeWC*isoWC_to_PX; 
      }
      else // already pixels
      {
        fSize = this.fontSize*zoomScl;
      }
      const charSpc = (this.charSpacing)? this.charSpacing : 0.6*fSize;  // pixels default
      const ltrSpace = charSpc*PX_to_isoWC;  // world coords

      // calc the path length when plotted in iso or non-iso coords to get the offset distance
      let pth = this.pth;  // path is defined in isoWC
      if (!this.pathIso)
      {
        pth = this.pth.scale(1, yisoWC_to_WC);   // isoWC now stretched to be WC 
      }
      const tLen = pth.getTotalLength();
      let d = tLen*this.offset/100; // distance along track of first char

      // get char positions, work with original, non-stretched, path
      const posAry = [];
      posAry[0] = pth.getPointAtLength(d);   // returns {x:, y: dx:, dy: }
      posAry[0].y *= yWC_to_isoWC;
      for (let i=1; i<this.str.length; i++)
      {
        d += ltrSpace;   // add one letter space to the first char distance
        let pos = pth.getPointAtLength(d);   // use stretched path to get angle right
        pos.y *= yWC_to_isoWC;               // switch back to isoWC, they will be stretched by render
        posAry[i] = pos; // convert the distance to world coords (and gradient)
      }

      const txt = [];
      for (let i=0; i<this.str.length; i++)
      {
        txt[i] = new Text(this.str.charAt(i));   // prepare standard text
        const slope = 180*posAry[i].gradient/Math.PI;
        txt[i].addTransformProperty("rot", slope);
        txt[i].addTransformProperty("x", posAry[i].x);
        txt[i].addTransformProperty("y", posAry[i].y);

        for (let prop in this.options)
        {
          if (transforms.includes(prop))
            txt[i].addTransformProperty(prop, this.options[prop]);
          else
            txt[i].setStyleProperty(prop, this.options[prop]);
        }
        if (this.options.fontSize || this.options.fontsize)
        {
          txt[i].setStyleProperty("fontSize", fSize);  // override with massaged version
        }
      }
      this.children.length = 0;
      this.addObj(txt);
    }
  };

   /*==============================================================
  * This text code is based on Jim Studt, CanvasTextFunctions
  * see http://jim.studt.net/canvastext/
  * It has been adapted to output Cgo2D format and has had Greek
  * letters and a few symbols added to Hershey's original font
  *-------------------------------------------------------------*/
  const hersheyFont = {};

  hersheyFont.letters = {
  /*   */ ' ': {width:16, cdata:[]},
  /* ! */ '!': {width:10, cdata:['M',5,21,'L',5,7,'M',5,2,'L',4,1,5,0,6,1,5,2]},
  /* " */ '"': {width:16, cdata:['M',4,21,'L',4,14,'M',12,21,'L',12,14]},
  /* # */ '#': {width:21, cdata:['M',11,25,'L',4,-7,'M',17,25,'L',10,-7,'M',4,12,'L',18,12,'M',3,6,'L',17,6]},
  /* $ */ '$': {width:20, cdata:['M',8,25,'L',8,-4,'M',12,25,'L',12,-4,'M',17,18,'L',15,20,12,21,8,21,5,20,3,18,3,16,4,14,5,13,7,12,13,10,15,9,16,8,17,6,17,3,15,1,12,0,8,0,5,1,3,3]},
  /* % */ '%': {width:24, cdata:['M',21,21,'L',3,0,'M',8,21,'L',10,19,10,17,9,15,7,14,5,14,3,16,3,18,4,20,6,21,8,21,10,20,13,19,16,19,19,20,21,21,'M',17,7,'L',15,6,14,4,14,2,16,0,18,0,20,1,21,3,21,5,19,7,17,7]},
  /* & */ '&': {width:26, cdata:['M',23,12,'L',23,13,22,14,21,14,20,13,19,11,17,6,15,3,13,1,11,0,7,0,5,1,4,2,3,4,3,6,4,8,5,9,12,13,13,14,14,16,14,18,13,20,11,21,9,20,8,18,8,16,9,13,11,10,16,3,18,1,20,0,22,0,23,1,23,2]},
  /* ' */ '\'': {width:10, cdata:['M',5,19,'L',4,20,5,21,6,20,6,18,5,16,4,15]},
  /* ( */ '(': {width:14, cdata:['M',11,25,'L',9,23,7,20,5,16,4,11,4,7,5,2,7,-2,9,-5,11,-7]},
  /* ) */ ')': {width:14, cdata:['M',3,25,'L',5,23,7,20,9,16,10,11,10,7,9,2,7,-2,5,-5,3,-7]},
  /* * */ '*': {width:16, cdata:['M',8,15,'L',8,3,'M',3,12,'L',13,6,'M',13,12,'L',3,6]},
  /* + */ '+': {width:26, cdata:['M',13,18,'L',13,0,'M',4,9,'L',22,9]},
  /* , */ ',': {width:8, cdata:['M',5,4,'L',4,3,3,4,4,5,5,4,5,2,3,0]},
  /* - */ '-': {width:26, cdata:['M',4,9,'L',22,9]},
  /* . */ '.': {width:8, cdata:['M',4,5,'L',3,4,4,3,5,4,4,5]},
  /* / */ '/': {width:22, cdata:['M',20,25,'L',2,-7]},
  /* 0 */ '0': {width:20, cdata:['M',9,21,'L',6,20,4,17,3,12,3,9,4,4,6,1,9,0,11,0,14,1,16,4,17,9,17,12,16,17,14,20,11,21,9,21]},
  /* 1 */ '1': {width:20, cdata:['M',6,17,'L',8,18,11,21,11,0]},
  /* 2 */ '2': {width:20, cdata:['M',4,16,'L',4,17,5,19,6,20,8,21,12,21,14,20,15,19,16,17,16,15,15,13,13,10,3,0,17,0]},
  /* 3 */ '3': {width:20, cdata:['M',5,21,'L',16,21,10,13,13,13,15,12,16,11,17,8,17,6,16,3,14,1,11,0,8,0,5,1,4,2,3,4]},
  /* 4 */ '4': {width:20, cdata:['M',13,21,'L',3,7,18,7,'M',13,21,'L',13,0]},
  /* 5 */ '5': {width:20, cdata:['M',15,21,'L',5,21,4,12,5,13,8,14,11,14,14,13,16,11,17,8,17,6,16,3,14,1,11,0,8,0,5,1,4,2,3,4]},
  /* 6 */ '6': {width:20, cdata:['M',16,18,'L',15,20,12,21,10,21,7,20,5,17,4,12,4,7,5,3,7,1,10,0,11,0,14,1,16,3,17,6,17,7,16,10,14,12,11,13,10,13,7,12,5,10,4,7]},
  /* 7 */ '7': {width:20, cdata:['M',17,21,'L',7,0,'M',3,21,'L',17,21]},
  /* 8 */ '8': {width:20, cdata:['M',8,21,'L',5,20,4,18,4,16,5,14,7,13,11,12,14,11,16,9,17,7,17,4,16,2,15,1,12,0,8,0,5,1,4,2,3,4,3,7,4,9,6,11,9,12,13,13,15,14,16,16,16,18,15,20,12,21,8,21]},
  /* 9 */ '9': {width:20, cdata:['M',16,14,'L',15,11,13,9,10,8,9,8,6,9,4,11,3,14,3,15,4,18,6,20,9,21,10,21,13,20,15,18,16,14,16,9,15,4,13,1,10,0,8,0,5,1,4,3]},
  /* : */ ':': {width:8, cdata:['M',4,12,'L',3,11,4,10,5,11,4,12,'M',4,5,'L',3,4,4,3,5,4,4,5]},
  /* ; */ ';': {width:8, cdata:['M',4,12,'L',3,11,4,10,5,11,4,12,'M',5,4,'L',4,3,3,4,4,5,5,4,5,2,3,0]},
  /* < */ '<': {width:24, cdata:['M',20,18,'L',4,9,20,0]},
  /* = */ '=': {width:26, cdata:['M',4,12,'L',22,12,'M',4,6,'L',22,6]},
  /* > */ '>': {width:24, cdata:['M',4,18,'L',20,9,4,0]},
  /* ? */ '?': {width:18, cdata:['M',3,16,'L',3,17,4,19,5,20,7,21,11,21,13,20,14,19,15,17,15,15,14,13,13,12,9,10,9,7,'M',9,2,'L',8,1,9,0,10,1,9,2]},
  /* @ */ '@': {width:27, cdata:['M',18,13,'L',17,15,15,16,12,16,10,15,9,14,8,11,8,8,9,6,11,5,14,5,16,6,17,8,'M',12,16,'L',10,14,9,11,9,8,10,6,11,5,'M',18,16,'L',17,8,17,6,19,5,21,5,23,7,24,10,24,12,23,15,22,17,20,19,18,20,15,21,12,21,9,20,7,19,5,17,4,15,3,12,3,9,4,6,5,4,7,2,9,1,12,0,15,0,18,1,20,2,21,3,'M',19,16,'L',18,8,18,6,19,5]},
  /* A */ 'A': {width:18, cdata:['M',9,21,'L',1,0,'M',9,21,'L',17,0,'M',4,7,'L',14,7]},
  /* B */ 'B': {width:21, cdata:['M',4,21,'L',4,0,'M',4,21,'L',13,21,16,20,17,19,18,17,18,15,17,13,16,12,13,11,'M',4,11,'L',13,11,16,10,17,9,18,7,18,4,17,2,16,1,13,0,4,0]},
  /* C */ 'C': {width:21, cdata:['M',18,16,'L',17,18,15,20,13,21,9,21,7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5]},
  /* D */ 'D': {width:21, cdata:['M',4,21,'L',4,0,'M',4,21,'L',11,21,14,20,16,18,17,16,18,13,18,8,17,5,16,3,14,1,11,0,4,0]},
  /* E */ 'E': {width:19, cdata:['M',4,21,'L',4,0,'M',4,21,'L',17,21,'M',4,11,'L',12,11,'M',4,0,'L',17,0]},
  /* F */ 'F': {width:18, cdata:['M',4,21,'L',4,0,'M',4,21,'L',17,21,'M',4,11,'L',12,11]},
  /* G */ 'G': {width:21, cdata:['M',18,16,'L',17,18,15,20,13,21,9,21,7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,18,8,'M',13,8,'L',18,8]},
  /* H */ 'H': {width:22, cdata:['M',4,21,'L',4,0,'M',18,21,'L',18,0,'M',4,11,'L',18,11]},
  /* I */ 'I': {width:8, cdata:['M',4,21,'L',4,0]},
  /* J */ 'J': {width:16, cdata:['M',12,21,'L',12,5,11,2,10,1,8,0,6,0,4,1,3,2,2,5,2,7]},
  /* K */ 'K': {width:21, cdata:['M',4,21,'L',4,0,'M',18,21,'L',4,7,'M',9,12,'L',18,0]},
  /* L */ 'L': {width:17, cdata:['M',4,21,'L',4,0,'M',4,0,'L',16,0]},
  /* M */ 'M': {width:24, cdata:['M',4,21,'L',4,0,'M',4,21,'L',12,0,'M',20,21,'L',12,0,'M',20,21,'L',20,0]},
  /* N */ 'N': {width:22, cdata:['M',4,21,'L',4,0,'M',4,21,'L',18,0,'M',18,21,'L',18,0]},
  /* O */ 'O': {width:22, cdata:['M',9,21,'L',7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,19,8,19,13,18,16,17,18,15,20,13,21,9,21]},
  /* P */ 'P': {width:21, cdata:['M',4,21,'L',4,0,'M',4,21,'L',13,21,16,20,17,19,18,17,18,14,17,12,16,11,13,10,4,10]},
  /* Q */ 'Q': {width:22, cdata:['M',9,21,'L',7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,19,8,19,13,18,16,17,18,15,20,13,21,9,21,'M',12,4,'L',18,-2]},
  /* R */ 'R': {width:21, cdata:['M',4,21,'L',4,0,'M',4,21,'L',13,21,16,20,17,19,18,17,18,15,17,13,16,12,13,11,4,11,'M',11,11,'L',18,0]},
  /* S */ 'S': {width:20, cdata:['M',17,18,'L',15,20,12,21,8,21,5,20,3,18,3,16,4,14,5,13,7,12,13,10,15,9,16,8,17,6,17,3,15,1,12,0,8,0,5,1,3,3]},
  /* T */ 'T': {width:16, cdata:['M',8,21,'L',8,0,'M',1,21,'L',15,21]},
  /* U */ 'U': {width:22, cdata:['M',4,21,'L',4,6,5,3,7,1,10,0,12,0,15,1,17,3,18,6,18,21]},
  /* V */ 'V': {width:18, cdata:['M',1,21,'L',9,0,'M',17,21,'L',9,0]},
  /* W */ 'W': {width:24, cdata:['M',2,21,'L',7,0,'M',12,21,'L',7,0,'M',12,21,'L',17,0,'M',22,21,'L',17,0]},
  /* X */ 'X': {width:20, cdata:['M',3,21,'L',17,0,'M',17,21,'L',3,0]},
  /* Y */ 'Y': {width:18, cdata:['M',1,21,'L',9,11,9,0,'M',17,21,'L',9,11]},
  /* Z */ 'Z': {width:20, cdata:['M',17,21,'L',3,0,'M',3,21,'L',17,21,'M',3,0,'L',17,0]},
  /* [ */ '[': {width:14, cdata:['M',4,25,'L',4,-7,'M',5,25,'L',5,-7,'M',4,25,'L',11,25,'M',4,-7,'L',11,-7]},
  /* \ */ '\\': {width:14, cdata:['M',0,21,'L',14,-3]},
  /* ] */ ']': {width:14, cdata:['M',9,25,'L',9,-7,'M',10,25,'L',10,-7,'M',3,25,'L',10,25,'M',3,-7,'L',10,-7]},
  /* ^ */ '^': {width:16, cdata:['M',8,23,'L',0,9,'M',8,23,'L',16,9]},
  /* _ */ '_': {width:18, cdata:['M',0,-7,'L',18,-7]},
  /* ` */ '`': {width:8, cdata:['M',5,16,'L',3,14,3,12,4,11,5,12,4,13,3,12]},
  /* a */ 'a': {width:19, cdata:['M',15,14,'L',15,0,'M',15,11,'L',13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]},
  /* b */ 'b': {width:19, cdata:['M',4,21,'L',4,0,'M',4,11,'L',6,13,8,14,11,14,13,13,15,11,16,8,16,6,15,3,13,1,11,0,8,0,6,1,4,3]},
  /* c */ 'c': {width:18, cdata:['M',15,11,'L',13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]},
  /* d */ 'd': {width:19, cdata:['M',15,21,'L',15,0,'M',15,11,'L',13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]},
  /* e */ 'e': {width:18, cdata:['M',3,8,'L',15,8,15,10,14,12,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]},
  /* f */ 'f': {width:12, cdata:['M',10,21,'L',8,21,6,20,5,17,5,0,'M',2,14,'L',9,14]},
  /* g */ 'g': {width:19, cdata:['M',15,14,'L',15,-2,14,-5,13,-6,11,-7,8,-7,6,-6,'M',15,11,'L',13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]},
  /* h */ 'h': {width:19, cdata:['M',4,21,'L',4,0,'M',4,10,'L',7,13,9,14,12,14,14,13,15,10,15,0]},
  /* i */ 'i': {width:8, cdata:['M',3,21,'L',4,20,5,21,4,22,3,21,'M',4,14,'L',4,0]},
  /* j */ 'j': {width:10, cdata:['M',5,21,'L',6,20,7,21,6,22,5,21,'M',6,14,'L',6,-3,5,-6,3,-7,1,-7]},
  /* k */ 'k': {width:17, cdata:['M',4,21,'L',4,0,'M',14,14,'L',4,4,'M',8,8,'L',15,0]},
  /* l */ 'l': {width:8, cdata:['M',4,21,'L',4,0]},
  /* m */ 'm': {width:30, cdata:['M',4,14,'L',4,0,'M',4,10,'L',7,13,9,14,12,14,14,13,15,10,15,0,'M',15,10,'L',18,13,20,14,23,14,25,13,26,10,26,0]},
  /* n */ 'n': {width:19, cdata:['M',4,14,'L',4,0,'M',4,10,'L',7,13,9,14,12,14,14,13,15,10,15,0]},
  /* o */ 'o': {width:19, cdata:['M',8,14,'L',6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3,16,6,16,8,15,11,13,13,11,14,8,14]},
  /* p */ 'p': {width:19, cdata:['M',4,14,'L',4,-7,'M',4,11,'L',6,13,8,14,11,14,13,13,15,11,16,8,16,6,15,3,13,1,11,0,8,0,6,1,4,3]},
  /* q */ 'q': {width:19, cdata:['M',15,14,'L',15,-7,'M',15,11,'L',13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]},
  /* r */ 'r': {width:13, cdata:['M',4,14,'L',4,0,'M',4,8,'L',5,11,7,13,9,14,12,14]},
  /* s */ 's': {width:17, cdata:['M',14,11,'L',13,13,10,14,7,14,4,13,3,11,4,9,6,8,11,7,13,6,14,4,14,3,13,1,10,0,7,0,4,1,3,3]},
  /* t */ 't': {width:12, cdata:['M',5,21,'L',5,4,6,1,8,0,10,0,'M',2,14,'L',9,14]},
  /* u */ 'u': {width:19, cdata:['M',4,14,'L',4,4,5,1,7,0,10,0,12,1,15,4,'M',15,14,'L',15,0]},
  /* v */ 'v': {width:16, cdata:['M',2,14,'L',8,0,'M',14,14,'L',8,0]},
  /* w */ 'w': {width:22, cdata:['M',3,14,'L',7,0,'M',11,14,'L',7,0,'M',11,14,'L',15,0,'M',19,14,'L',15,0]},
  /* x */ 'x': {width:17, cdata:['M',3,14,'L',14,0,'M',14,14,'L',3,0]},
  /* y */ 'y': {width:16, cdata:['M',2,14,'L',8,0,'M',14,14,'L',8,0,6,-4,4,-6,2,-7,1,-7]},
  /* z */ 'z': {width:17, cdata:['M',14,14,'L',3,0,'M',3,14,'L',14,14,'M',3,0,'L',14,0]},
  /* { */ '{': {width:14, cdata:['M',9,25,'L',7,24,6,23,5,21,5,19,6,17,7,16,8,14,8,12,6,10,'M',7,24,'L',6,22,6,20,7,18,8,17,9,15,9,13,8,11,4,9,8,7,9,5,9,3,8,1,7,0,6,-2,6,-4,7,-6,'M',6,8,'L',8,6,8,4,7,2,6,1,5,-1,5,-3,6,-5,7,-6,9,-7]},
  /* | */ '|': {width:8, cdata:['M',4,25,'L',4,-7]},
  /* } */ '}': {width:14, cdata:['M',5,25,'L',7,24,8,23,9,21,9,19,8,17,7,16,6,14,6,12,8,10,'M',7,24,'L',8,22,8,20,7,18,6,17,5,15,5,13,6,11,10,9,6,7,5,5,5,3,6,1,7,0,8,-2,8,-4,7,-6,'M',8,8,'L',6,6,6,4,7,2,8,1,9,-1,9,-3,8,-5,7,-6,5,-7]},
  /* ~ */ '~': {width:24, cdata:['M',3,6,'L',3,8,4,11,6,12,8,12,10,11,14,8,16,7,18,7,20,8,21,10,'M',3,8,'L',4,10,6,11,8,11,10,10,14,7,16,6,18,6,20,7,21,10,21,12]},
  /*      &deg; */ '\u00B0': {width:14, cdata:['M',6,21,'L',4,20,3,18,3,16,4,14,6,13,8,13,10,14,11,16,11,18,10,20,8,21,6,21]},
  /*   &middot; */ '\u00B7': {width:5, cdata:['M',2,10,'L',2,9,3,9,3,10,2,10]},
  /*    &times; */ '\u00D7': {width:22, cdata:['M',4,16,'L',18,2,'M',18,16,'L',4,2]},
  /*   &divide; */ '\u00F7': {width:26, cdata:['M',13,18,'L',12,17,13,16,14,17,13,18,'M',4,9,'L',22,9,'M',13,2,'L',12,1,13,0,14,1,13,2]},
  /*    &Alpha; */ '\u0391': {width:18, cdata:['M',9,21,'L',1,0,'M',9,21,'L',17,0,'M',4,7,'L',14,7]},
  /*     &Beta; */ '\u0392': {width:21, cdata:['M',4,21,'L',4,0,'M',4,21,'L',13,21,16,20,17,19,18,17,18,15,17,13,16,12,13,11,'M',4,11,'L',13,11,16,10,17,9,18,7,18,4,17,2,16,1,13,0,4,0]},
  /*    &Gamma; */ '\u0393': {width:17, cdata:['M',4,21,'L',4,0,'M',4,21,'L',16,21]},
  /*    &Delta; */ '\u0394': {width:18, cdata:['M',9,21,'L',1,0,'M',9,21,'L',17,0,'M',1,0,'L',17,0]},
  /*  &Epsilon; */ '\u0395': {width:19, cdata:['M',4,21,'L',4,0,'M',4,21,'L',17,21,'M',4,11,'L',12,11,'M',4,0,'L',17,0]},
  /*     &Zeta; */ '\u0396': {width:20, cdata:['M',17,21,'L',3,0,'M',3,21,'L',17,21,'M',3,0,'L',17,0]},
  /*      &Eta; */ '\u0397': {width:22, cdata:['M',4,21,'L',4,0,'M',18,21,'L',18,0,'M',4,11,'L',18,11]},
  /*    &Theta; */ '\u0398': {width:22, cdata:['M',9,21,'L',7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,19,8,19,13,18,16,17,18,15,20,13,21,9,21,'M',8,11,'L',14,11]},
  /*     &Iota; */ '\u0399': {width:8, cdata:['M',4,21,'L',4,0]},
  /*    &Kappa; */ '\u039A': {width:21, cdata:['M',4,21,'L',4,0,'M',18,21,'L',4,7,'M',9,12,'L',18,0]},
  /*   &Lambda; */ '\u039B': {width:18, cdata:['M',9,21,'L',1,0,'M',9,21,'L',17,0]},
  /*       &Mu; */ '\u039C': {width:24, cdata:['M',4,21,'L',4,0,'M',4,21,'L',12,0,'M',20,21,'L',12,0,'M',20,21,'L',20,0]},
  /*       &Nu; */ '\u039D': {width:22, cdata:['M',4,21,'L',4,0,'M',4,21,'L',18,0,'M',18,21,'L',18,0]},
  /*       &Xi; */ '\u039E': {width:18, cdata:['M',2,21,'L',16,21,'M',6,11,'L',12,11,'M',2,0,'L',16,0]},
  /*  &Omicron; */ '\u039F': {width:22, cdata:['M',9,21,'L',7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,19,8,19,13,18,16,17,18,15,20,13,21,9,21]},
  /*       &Pi; */ '\u03A0': {width:22, cdata:['M',4,21,'L',4,0,'M',18,21,'L',18,0,'M',4,21,'L',18,21]},
  /*      &Rho; */ '\u03A1': {width:21, cdata:['M',4,21,'L',4,0,'M',4,21,'L',13,21,16,20,17,19,18,17,18,14,17,12,16,11,13,10,4,10]},
  /*    &Sigma; */ '\u03A3': {width:18, cdata:['M',2,21,'L',9,11,2,0,'M',2,21,'L',16,21,'M',2,0,'L',16,0]},
  /*      &Tau; */ '\u03A4': {width:16, cdata:['M',8,21,'L',8,0,'M',1,21,'L',15,21]},
  /*  &Upsilon; */ '\u03A5': {width:18, cdata:['M',2,16,'L',2,18,3,20,4,21,6,21,7,20,8,18,9,14,9,0,'M',16,16,'L',16,18,15,20,14,21,12,21,11,20,10,18,9,14]},
  /*      &Phi; */ '\u03A6': {width:20, cdata:['M',10,21,'L',10,0,'M',8,16,'L',5,15,4,14,3,12,3,9,4,7,5,6,8,5,12,5,15,6,16,7,17,9,17,12,16,14,15,15,12,16,8,16]},
  /*      &Chi; */ '\u03A7': {width:20, cdata:['M',3,21,'L',17,0,'M',3,0,'L',17,21]},
  /*      &Psi; */ '\u03A8': {width:22, cdata:['M',11,21,'L',11,0,'M',2,15,'L',3,15,4,14,5,10,6,8,7,7,10,6,12,6,15,7,16,8,17,10,18,14,19,15,20,15]},
  /*    &Omega; */ '\u03A9': {width:20, cdata:['M',3,0,'L',7,0,4,7,3,11,3,15,4,18,6,20,9,21,11,21,14,20,16,18,17,15,17,11,16,7,13,0,17,0]},
  /*    &alpha; */ '\u03B1': {width:21, cdata:['M',9,14,'L',7,13,5,11,4,9,3,6,3,3,4,1,6,0,8,0,10,1,13,4,15,7,17,11,18,14,'M',9,14,'L',11,14,12,13,13,11,15,3,16,1,17,0,18,0]},
  /*     &beta; */ '\u03B2': {width:19, cdata:['M',12,21,'L',10,20,8,18,6,14,5,11,4,7,3,1,2,-7,'M',12,21,'L',14,21,16,19,16,16,15,14,14,13,12,12,9,12,'M',9,12,'L',11,11,13,9,14,7,14,4,13,2,12,1,10,0,8,0,6,1,5,2,4,5]},
  /*    &gamma; */ '\u03B3': {width:19, cdata:['M',1,11,'L',3,13,5,14,6,14,8,13,9,12,10,9,10,5,9,0,'M',17,14,'L',16,11,15,9,9,0,7,-4,6,-7]},
  /*    &delta; */ '\u03B4': {width:18, cdata:['M',11,14,'L',8,14,6,13,4,11,3,8,3,5,4,2,5,1,7,0,9,0,11,1,13,3,14,6,14,9,13,12,11,14,9,16,8,18,8,20,9,21,11,21,13,20,15,18]},
  /*  &epsilon; */ '\u03B5': {width:16, cdata:['M',13,12,'L',12,13,10,14,7,14,5,13,5,11,6,9,9,8,'M',9,8,'L',5,7,3,5,3,3,4,1,6,0,9,0,11,1,13,3]},
  /*     &zeta; */ '\u03B6': {width:15, cdata:['M',10,21,'L',8,20,7,19,7,18,8,17,11,16,14,16,'M',14,16,'L',10,14,7,12,4,9,3,6,3,4,4,2,6,0,9,-2,10,-4,10,-6,9,-7,7,-7,6,-5]},
  /*      &eta; */ '\u03B7': {width:20, cdata:['M',1,10,'L',2,12,4,14,6,14,7,13,7,11,6,7,4,0,'M',6,7,'L',8,11,10,13,12,14,14,14,16,12,16,9,15,4,12,-7]},
  /*     &theta */ '\u03B8': {width:21, cdata:['M',12,21,'L',9,20,7,18,5,15,4,13,3,9,3,5,4,2,5,1,7,0,9,0,12,1,14,3,16,6,17,8,18,12,18,16,17,19,16,20,14,21,12,21,'M',4,11,'L',18,11]},
  /*     &iota; */ '\u03B9': {width:11, cdata:['M',6,14,'L',4,7,3,3,3,1,4,0,6,0,8,2,9,4]},
  /*    &kappa; */ '\u03BA': {width:18, cdata:['M',6,14,'L',2,0,'M',16,13,'L',15,14,14,14,12,13,8,9,6,8,5,8,'M',5,8,'L',7,7,8,6,10,1,11,0,12,0,13,1]},
  /*   &lambda; */ '\u03BB': {width:16, cdata:['M',1,21,'L',3,21,5,20,6,19,14,0,'M',8,14,'L',2,0]},
  /*       &mu; */ '\u03BC': {width:21, cdata:['M',7,14,'L',1,-7,'M',6,10,'L',5,5,5,2,7,0,9,0,11,1,13,3,15,7,'M',17,14,'L',15,7,14,3,14,1,15,0,17,0,19,2,20,4]},
  /*       &nu; */ '\u03BD': {width:18, cdata:['M',3,14,'L',6,14,5,8,4,3,3,0,'M',16,14,'L',15,11,14,9,12,6,9,3,6,1,3,0]},
  /*       &xi; */ '\u03BE': {width:16, cdata:['M',10,21,'L',8,20,7,19,7,18,8,17,11,16,14,16,'M',11,16,'L',8,15,6,14,5,12,5,10,7,8,10,7,12,7,'M',10,7,'L',6,6,4,5,3,3,3,1,5,-1,9,-3,10,-4,10,-6,8,-7,6,-7]},
  /*  &omicron; */ '\u03BF': {width:17, cdata:['M',8,14,'L',6,13,4,11,3,8,3,5,4,2,5,1,7,0,9,0,11,1,13,3,14,6,14,9,13,12,12,13,10,14,8,14]},
  /*       &pi; */ '\u03C0': {width:22, cdata:['M',9,14,'L',5,0,'M',14,14,'L',15,8,16,3,17,0,'M',2,11,'L',4,13,7,14,20,14]},
  /*      &rho; */ '\u03C1': {width:18, cdata:['M',4,8,'L',4,5,5,2,6,1,8,0,10,0,12,1,14,3,15,6,15,9,14,12,13,13,11,14,9,14,7,13,5,11,4,8,0,-7]},
  /*    &sigma; */ '\u03C3': {width:20, cdata:['M',18,14,'L',8,14,6,13,4,11,3,8,3,5,4,2,5,1,7,0,9,0,11,1,13,3,14,6,14,9,13,12,12,13,10,14]},
  /*      &tau; */ '\u03C4': {width:20, cdata:['M',11,14,'L',8,0,'M',2,11,'L',4,13,7,14,18,14]},
  /*  &upsilon; */ '\u03C5': {width:20, cdata:['M',1,10,'L',2,12,4,14,6,14,7,13,7,11,5,5,5,2,7,0,9,0,12,1,14,3,16,7,17,11,17,14]},
  /*      &phi; */ '\u03C6': {width:22, cdata:['M',8,13,'L',6,12,4,10,3,7,3,4,4,2,5,1,7,0,10,0,13,1,16,3,18,6,19,9,19,12,17,14,15,14,13,12,11,8,9,3,6,-7]},
  /*      &chi; */ '\u03C7': {width:18, cdata:['M',2,14,'L',4,14,6,12,12,-5,14,-7,16,-7,'M',17,14,'L',16,12,14,9,4,-2,2,-5,1,-7]},
  /*      &psi; */ '\u03C8': {width:23, cdata:['M',16,21,'L',8,-7,'M',1,10,'L',2,12,4,14,6,14,7,13,7,11,6,6,6,3,7,1,9,0,11,0,14,1,16,3,18,6,20,11,21,14]},
  /*    &omega; */ '\u03C9': {width:23, cdata:['M',8,14,'L',6,13,4,10,3,7,3,4,4,1,5,0,7,0,9,1,11,4,'M',12,8,'L',11,4,12,1,13,0,15,0,17,1,19,4,20,7,20,10,19,13,18,14]},
  /* &thetasym; */ '\u03D1': {width:21, cdata:['M',1,10,'L',2,12,4,14,6,14,7,13,7,11,6,6,6,3,7,1,8,0,10,0,12,1,14,4,15,6,16,9,17,14,17,17,16,20,14,21,12,21,11,19,11,17,12,14,14,11,16,9,19,7]}
  };

  hersheyFont.strWidth = function(str)
  {
    let total = 0;

    for (let i=0; i<str.length; i++)
    {
      const c = hersheyFont.letters[str.charAt(i)];
      if (c)
      {
        total += c.width;
      }
    }

    return total;
  };

  hersheyFont.stringToCgo2D = function(strg, fontSz, lorg)
  {
    const size = fontSz || 12,
          mag = size/33,    // size/33 is scale factor to give requested font size in pixels
          lorigin = lorg || 7;
    let lorgX, lorgY,
        charData,
        cgoData = [];

    function shiftChar(cAry, dx, dy, scl)    // cAry = Hershey Cgo2D array, d = shift required
    {
      const newAry = [];
      let x, y,
          j = 0;

      while (j<cAry.length)
      {
        if (typeof cAry[j] === "string")
        {
          newAry.push(cAry[j++]);      // push the command letter
        }
        x = scl*(cAry[j++] + dx);   // j now index of x coord in x,y pair
        y = scl*(cAry[j++] + dy);
        newAry.push(+x.toFixed(3), +y.toFixed(3));   // the '+' coverts string back to number
      }
      return newAry;
    }

    if (typeof strg !== 'string')
    {
      return {"cgoData": [], "width": 0, "height": 0};
    }
    /* Note: char cell is 33 pixels high, M char size is 21 pixels (0 to 21), descenders go from -7 to 21.
      to convert this data to fontSize (pixels) scale array data by fontSize/33.
      Reference height for vertically alignment is charHeight = 29 pixels. */
    const wid = this.strWidth(strg)
    const hgt = 29;           // default font size in pixels,  wid = string width in pixels
    const wid2 = wid/2;
    const hgt2 = hgt/2;
    const lorgWC = [0, [0,  hgt], [wid2,  hgt], [wid,  hgt],
                       [0, hgt2], [wid2, hgt2], [wid, hgt2],
                       [0,    0], [wid2,    0], [wid,    0]];
    // calc lorg offset
    if (lorgWC[lorigin] !== undefined)  // check for out of bounds
    {
      lorgX = -lorgWC[lorigin][0];
      lorgY = -lorgWC[lorigin][1]+0.25*hgt;   // correct for alphabetic baseline, its offset about 0.25*char height ;
    }
    // sft is the shift to move each letter into place
    for (let i=0, sft=0, c; i<strg.length; i++)
    {
      c = hersheyFont.letters[strg.charAt(i)];
      if (c)
      {
        charData = shiftChar(c.cdata, sft+lorgX, lorgY, mag);
        sft += c.width;               // add character width to total
        cgoData = cgoData.concat(charData);   // make a single array of cgo2D for the whole string
      }
    }

    return {"cgoData": cgoData, "width": wid*mag, "height": hgt*mag, "weight":2.5*mag};
  };

  VectorText = class extends Group
  {
    constructor(str, opts={})
    {
      super();
      this.txtStr = str;
      this.fontSize = 15;   // pixels, default
      this.fontWeight = 400;
      this.txtCol = "#303030";
      this.bkgCol;
      this.lorg = 1;        // default
      this.options = opts;

      this.setOptionProperty = (propertyName, value)=>
      {
        const lorgVals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      
        if ((typeof propertyName !== "string")||(value === undefined))
        {
          return;
        }
      
        switch (propertyName.toLowerCase())
        {
          case "color":
          case "strokecolor":
            this.txtCol = value;
            break;
          case "bgfillcolor":
            (typeof value === "string")
            {
              this.bkgCol = value;
            }
            break;
          case "fontsize":
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSize = value;
            }
            break;
          case "fontsizewc": 
            if ((typeof value === "number")&&(value > 0))
            {
              this.fontSizeWC = value;
            }
            break;
          case "fontweight":
            if ((typeof value === "string")||((typeof value === "number")&&(value>=100)&&(value<=900)))
            {
              this.fontWeight = value;
            }
            break;
          case "lorg":
            if (lorgVals.indexOf(value) !== -1)
            {
              this.lorg = value;
            }
            break;
          default:
            break;
        }
      };
              
      for (let prop in opts)
      {
        if (opts.hasOwnProperty(prop)) // own property, not inherited from prototype
        {
          this.setOptionProperty(prop, opts[prop]);
        }
      }

      let fntWgt = this.fontWeight;    // default
      if (typeof this.fontWeight === "string")
      {
        switch (this.fontWeight)
        {
          case "normal":
          fntWgt = 400;
          break;
          case "bold":
          default:
          fntWgt = 700;
          break;
          case "bolder":
          fntWgt = 900;
          break;
          case "lighter":
          fntWgt = 200;
          break;
        }
      }
      else if (typeof this.fontWeight === "number")
      {
        fntWgt = this.fontWeight;
      }

      const fntSz = 30;    // working value to give good resolution if zoomed
      const lineWid = 0.8*fntSz*fntWgt/400;   // normal
      const pathData = hersheyFont.stringToCgo2D(this.txtStr, fntSz, 7);
      const txtData = new PathSVG(pathData.cgoData);      
      this.txtObj = new Path(txtData, {iso:true, strokeColor: this.txtCol, lineWidth: lineWid, lineCap:"round"});
    
      this.hgt = 1.5*pathData.height; // pixels
      const dl = 0.25*this.hgt;       // expand bbox by this much
      this.wid = pathData.width+2*dl; // width in WC

      if (this.bkgCol)
      {
        let bboxData = new PathSVG(["M",-dl,-0.6*dl, "v",this.hgt, "h",this.wid, "v",-this.hgt, "z"]);
        this.bbox = new Shape(bboxData, {fillColor: this.bkgCol});
        this.addObj(this.bbox);
      }
      this.addObj(this.txtObj);
    }

    preRender(gc)
    {
      const PX_to_isoWC = 1/gc.xscl;
      // convert fontSize to WorldCoords, assume pathData in WC times 30
      let fntScl = 1;
      if (this.fontSizeWC)
      {
        fntScl = this.fontSizeWC/30;    // 30 is Hershey default
      }
      else
      {
        fntScl = (this.fontSize/30)*PX_to_isoWC;
      }

      if (!this.hardTfmApplied)
      {
        const hgt = this.hgt;
        const dl = 0.25*hgt;        // expand bbox by this much
        const wid = this.wid;    // width in WC
        const wid2 = wid/2;
        const hgt2 = hgt/2;
        
        let lorgWC = [[0, 0], [0,  hgt], [wid2,  hgt], [wid,  hgt],
                              [0, hgt2], [wid2, hgt2], [wid, hgt2],
                              [0,    0], [wid2,    0], [wid,   0]];
        let lorgdx = -lorgWC[this.lorg][0] + dl;
        let lorgdy = -lorgWC[this.lorg][1] + 0.6*dl;
    
        this.addTransformProperty("x", lorgdx);
        this.addTransformProperty("y", lorgdy);
        this.addTransformProperty("scl", fntScl);
        this.txtObj.setStyleProperty("lineWidth", 0.08*this.fontSize*this.fontWeight/400);
        if (gc.yDown)
        {
          this.addTransformProperty("flip", "vert");
        }

        for (let prop in this.options)
        {
          this.addTransformProperty(prop, this.options[prop]);
        }
        
        this.hardTfmApplied = true;
      }
    }
  };

//===============================================================================
Cango.prototype.drawHTMLText = function(str, options)
  {
    const htmlTxt = new HTMLText(str, options);
    this.render(htmlTxt);
  };

  Cango.prototype.drawMathText = function(latex, options)
  {
    const mTxt = new MathText(latex, options);
    this.render(mTxt);
  };
  
  Cango.prototype.drawExpNotationText = function(man, exp, options) 
  {
    const expTxt = new ExpNotationText(man, exp, options);
    this.render(expTxt);
  };

  Cango.prototype.drawSciNotationText = function(val, options) 
  {
    const sciTxt = new SciNotationText(val, options);
    this.render(sciTxt);
  };

  Cango.prototype.drawTextOnPath = function(str, pathDesc, options)
  {
    const txtOnPth = new TextOnPath(str, pathDesc, options);
    this.render(txtOnPth);
  };

  Cango.prototype.drawVectorText = function(str, options)
  {
    const vTxt = new VectorText(str, options);
    this.render(vTxt); 
  }

}());
