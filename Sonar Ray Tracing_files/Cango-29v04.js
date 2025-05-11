/*==========================================================================
  Filename: Cango-29v04.js
  Rev: 29
  By: Dr A.R.Collins
  Description: A graphics library for the canvas element.

  Copyright 2012-2025 A.R.Collins
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
  For more detail about the GNU General Public License see
  <https://www.gnu.org/licenses/>.
    
  Giving credit to A.R.Collins <http://www.arc.id.au> would be appreciated.
  Report bugs to tony at arc.id.au.

  Date   |Description                                                   |By
  --------------------------------------------------------------------------
  14Oct12 Rev 1.00 First release based on Cango0v43                      ARC
  29Nov12 Released as Cango2v00                                          ARC
  06May14 Released as Cango4v00                                          ARC
  14Jul14 Released as Cango-5v00                                         ARC
  09Feb15 Released as Cango-6v00                                         ARC
  20Mar15 Released as Cango-7v00                                         ARC
  21Dec15 Released as Cango-8v00                                         ARC
  28Mar17 Released as Cango-9v00                                         ARC
  10Jul17 Released as Cango-10v00                                        ARC
  22Jul17 Released as Cango-11v00                                        ARC
  15Aug17 Released as Cango-12v00                                        ARC
  02Mar18 Released as Cango-13v00                                        ARC
  12Aug19 Released as Cango-15v00 (no transform, no shapeDefs)           ARC 
  19Nov19 Released as Cango-17v00                                        ARC
  10Jul20 Released as Cango-19v00                                        ARC
  08Nov20 Released as Cango-21v00                                        ARC
  11Jun21 Released as Cango-22v00                                        ARC
  02Jul21 Released as Cango-24v00                                        ARC
  05Oct21 Released as Cango-25v00                                        ARC
  12Apr22 Released as Cango-26v00                                        ARC
  14Apr22 Renamed dragOffset to more meaningful dragPos                  ARC
  15Apr22 Run drag-n-drop handler in the Cango calling scope
          bugfix: Missing return on getStyleProperty                     ARC
  30Jun22 Swapped argument order of enableDrag                           ARC
  01Jul22 Added transformRestore                                         ARC
  11Aug22 bugfix: scale Text fontSize for zoom before measuring          ARC
  16Jan23 Tidy gridbox dimension setting with consistent names           ARC
  09Feb23 Use classes throughout                                         ARC
  13Feb23 Added eventData.cancelDrag fn, software callable drop event    ARC
  18Feb23 bugfix: savScale for lineWidthWC lost since 25v01, put it back ARC
  20Feb23 Allow scl transform property to take Array(2) as argument      ARC
  21Feb23 Added flip as a transform property                             ARC
  08Apr23 Enable zoom-n-pan to handle canvas resize                      ARC
  15Apr23 bugfix: Obj2D transform properties set twice                   ARC 
  25Apr23 Reset clipMasks after all render not each child Group render   ARC 
  12Jun23 Refactor drag-n-drop and remove grabTransformRestore           ARC
  15Jun23 Simplify currOfsTfmAry to prevent it growing                   ARC
  16Jun23 Released as Cango-27v00                                        ARC
  31Aug23 Remove canvas Path2D references to facilitate translations     ARC
  13Mar24 Use own matrix methods instead of DOMMatrix                    ARC
  21Mar24 Refactor to use matrix multiply without reversing order        ARC
  22Mar24 Released as Cango-28v00                                        ARC
  31Nar24 Restore Path2D and DOMMatrix use (28v02)                       ARC
  09Apr24 Included core PathSVG into the core Cango (28v06)              ARC
  01Jun24 Drop ImageSegment replace with Img.crop method (28v07)         ARC
  13Jun24 bugfix: PATH and SHAPE dup getting ClipMask.paint method       ARC
  06Jan25 bugfix: dropShadows ignoring Shape's iso value                 ARC
  17Jan25 Add support for down and cancel event handlers for enableClick ARC
  20Jan25 Add gc (Cango context) to Drag n Drop eventData                ARC
  22Jan25 Tidy some y scale handling for clarity
          Renamed yWC_to_isoWC to correct meaning isoWC_to_yWC           ARC
  06Feb25 Got all matrix transforms to be applied in reverse order       ARC
  08Feb25 Released as Cango-29v00                                        ARC
  19Feb25 To simplify porting, make all matrix operations function calls ARC
  21Feb25 Swap matrixMult order, apply transforms in order of insertion  ARC
  23Feb25 Update to use PathSVG-5v00 code which adds transform method    ARC
  15Apr25 bugfix: clip mask not cleared for each nested Group            ARC
  ==========================================================================*/

  "use strict";
  var Cango, PathSVG,
      Path, Shape, Img, Text, ClipMask, Group,
      LinearGradient, RadialGradient; 

(function() {
  const types = ["GRP", "PATH", "SHAPE", "IMG", "TEXT", "CLIP"];

  function Path2DObj()
  {
    this.p2dWC = null;    // Path2D object with coords in world coordinates
    this.p2dPX = null;    // Path2D with coords scaled for canvas raw pixel coord system
    this.length = 0;
  }
  
  function matrixIdent()
  {
    return new DOMMatrix();
  }

  function matrixMult(A, B)
  {
    return A.multiply(B); // mathematically A x B
  }

  function matrixClone(M) // reset to the identity matrix
  { 
    return new DOMMatrix(M);
  }

  function matrixRotate(M, degs)
  {
    // Rotation transform for column vectors:
    // Rotate by angle T (in radians)
    const T = -degs*Math.PI/180.0;
    const cosT = Math.cos(T);
    const sinT = Math.sin(T);
    const A = new DOMMatrix([cosT, sinT, -sinT, cosT, 0.0, 0.0]);

    return matrixMult(A, M);  // A x M
  } 

  function matrixSkew(M, degsH, degsV)
  {
    // Skew angles (in radians)
    const Th = degsH*Math.PI/180.0;
    const Tv = degsV*Math.PI/180.0;
    const htn = Math.tan(Th);
    const vtn = Math.tan(Tv);
    const A = new DOMMatrix([1.0, vtn, htn, 1.0, 0.0, 0.0]);

    return matrixMult(A, M);  // A x M
  }

  function matrixScale(M, sclX, sclY)
  {
    // Scale transform for column vectors:
    let A = new DOMMatrix([sclX, 0.0, 0.0, sclY, 0.0, 0.0]);

    return matrixMult(A, M);
  }

  function matrixTranslate(M, ofsX, ofsY)
  {
    // Scale transform for column vectors:
    let A = new DOMMatrix([1.0, 0.0, 0.0, 1.0, ofsX, ofsY]);
    
    return matrixMult(A, M);  // A x M
  }

  function matrixTransformPoint(M, p)
  {
    const px = p.x,
          py = p.y;

    return {x:px*M.a + py*M.c + M.e, y:px*M.b + py*M.d + M.f};  // M x p (p is a column vector [[x], [y], [1]])
  }

  function hitTest(gc, pathObj, csrX, csrY)
  {
    gc.ctx.save();       // save un-scaled
    pathObj.pthCmds.p2dPX = new Path2D();
    pathObj.pthCmds.p2dPX.addPath(pathObj.pthCmds.p2dWC, pathObj.netTfm);   // scaled to pixels for raw canvas coords
    const hit = gc.ctx.isPointInPath(pathObj.pthCmds.p2dPX, csrX, csrY);

    gc.ctx.restore();

    return hit;
  }

  function initDragAndDrop(gc)
  {
    // calc top canvas at grab time since layers can come and go
    const nLrs = gc.bkgCanvas.layers.length;
    // find top canvas in the Stack, only top layer will catch events
    const topCvs = gc.bkgCanvas.layers[nLrs-1].cElem;

    function grabHandler(event){
      const rect = gc.cnvs.getBoundingClientRect();
      const csrX = event.clientX - rect.left;
      const csrY = event.clientY - rect.top;
      // run through all the registered objects and test if cursor pos is within their path
      loops:      // label to break out of nested loops
      for (let j = nLrs-1; j >= 0; j--)       // search top layer down the stack
      {
        const lyr = gc.bkgCanvas.layers[j];
        for (let k = lyr.dragObjects.length-1; k >= 0; k--)  // search from last drawn to first (underneath)
        {
          const testObj = lyr.dragObjects[k];
          if (hitTest(gc, testObj, csrX, csrY))
          {
            // call the grab handler for this object (check it is still enabled)
            if (testObj.dragNdrop)
            {
              testObj.dragNdrop.topCvs = topCvs;   // gc.bkgCanvas.layers[nLrs-1].cElem;
              testObj.dragNdrop.grab(event);
              break loops;
            }
          }
        }
      }
    }

    topCvs.onmousedown = (e)=>{grabHandler(e)};  
  } 

  class Drag2D 
  {
    constructor(type, dragFn, grabFn=null, dropFn=null, cancelFn=null) {
      // version of drop that can be called from an app to stop a drag before the mouseup event
      const cancelDragFn = ()=>
      {
        this.topCvs.onmouseup = null;
        this.topCvs.onmouseout = null;
        this.topCvs.onmousemove = null;
        if (this.dropCallback)
        {
          this.dropCallback.call(this.cgo, this.eventData);   // call with most recent drag data
        }
      };

      this.dndType = type;          // "drag" or "click"
      this.cgo = null;              // filled in by render
      this.layer = null;            // filled in by render
      this.topCvs = null;
      this.grabCallback = grabFn;
      this.dragCallback = dragFn;
      this.dropCallback = dropFn;
      this.cancelCallback = cancelFn;
      this.eventData = {
        gc: null,
        target: null,               // filled in by render
        pointerPos: {x:0, y:0},     // world coords
        savPointerPos: {x:0, y:0},  // position of cursor when target last drawn 
        dragPos: {x:0, y:0},
        dragOfs: {x:0, y:0},
        grabCsrPos: {x:0, y:0},     // world coords
        grabAngle: 0,
        dragAngle: 0,               // degrees
        dragOfsAngle: 0,
        cancelDrag: cancelDragFn
      }
    }

    mouseupHandler(event){
      this.topCvs.onmouseup = null;
      this.topCvs.onmouseout = null;
      this.topCvs.onmousemove = null;
      this.eventData.gc = this.cgo;
      if (this.dndType === "click")
      {
        // check if mouse moved outside object after mousedown and before mouseup (ie cancel onclick)
        const rect = this.cgo.cnvs.getBoundingClientRect();  // find the canvas boundaries
        const csrX = event.clientX - rect.left;
        const csrY = event.clientY - rect.top;
        const inside = hitTest(this.cgo, this.eventData.target, csrX, csrY);
        if (!inside)
          {
            if (this.cancelCallback)
            {
              this.cancelCallback.call(this.cgo, this.eventData);   // call in the scope of the Cango context
            }
            return;  // cancelled, and no onclick callback
          }
        }
      if (this.dropCallback)
      {
        this.dropCallback.call(this.cgo, this.eventData);   // call in the scope of the Cango context
      }
    }

    grab(event){
      const isoWC_to_yWC = Math.abs(this.cgo.yscl/this.cgo.xscl);
      const target = this.eventData.target;
      // calc top canvas at grab time since layers can come and go
      const nLrs = this.cgo.bkgCanvas.layers.length;
      this.topCvs = this.cgo.bkgCanvas.layers[nLrs-1].cElem;

      this.topCvs.onmouseup = (e)=>{this.mouseupHandler(e)};
      this.topCvs.onmouseout = (e)=>{this.drop(e)};
      const csrPosWC = this.cgo.getCursorPosWC(event);      // update mouse pos to pass to the owner
      this.eventData.gc = this.cgo;
      this.eventData.grabCsrPos.x = csrPosWC.x - target.dwgOrg.x;
      this.eventData.grabCsrPos.y = csrPosWC.y - target.dwgOrg.y;
      const csrX = csrPosWC.x - target.dwgOrg.x;
      const csrY = csrPosWC.y - target.dwgOrg.y;
      this.eventData.grabAngle = Math.atan2(csrY*isoWC_to_yWC, csrX)*180/Math.PI;
      this.eventData.savPointerPos.x = csrPosWC.x;   
      this.eventData.savPointerPos.y = csrPosWC.y;   
      this.eventData.pointerPos.x = csrPosWC.x;   
      this.eventData.pointerPos.y = csrPosWC.y;   
      this.eventData.dragPos.x = 0;
      this.eventData.dragPos.y = 0;
      this.eventData.dragOfs.x = 0;
      this.eventData.dragOfs.y = 0;
      this.eventData.dragAngle = 0;
      this.eventData.dragOfsAngle = 0;
  
      target.dNdActive = true;
      if (this.grabCallback)
      {
        this.grabCallback.call(this.cgo, this.eventData);   // call in the scope of the Cango context
      }
      this.topCvs.onmousemove = (event)=>{this.drag(event);};
      event.preventDefault();
      return false;
    }

    drag(event){
      const isoWC_to_yWC = Math.abs(this.cgo.yscl/this.cgo.xscl);
      const target = this.eventData.target;
      if (this.dragCallback)
      {
        const csrPosWC = this.cgo.getCursorPosWC(event);  // update mouse pos to pass to the owner
        this.eventData.gc = this.cgo;
        // save the last 'as drawn' values
        this.eventData.savPointerPos.x = this.eventData.pointerPos.x;
        this.eventData.savPointerPos.y = this.eventData.pointerPos.y;
        this.eventData.savAngle = this.eventData.dragAngle;    // save the last drag angle

        this.eventData.pointerPos.x = csrPosWC.x;
        this.eventData.pointerPos.y = csrPosWC.y;
        this.eventData.dragPos.x = csrPosWC.x - this.eventData.grabCsrPos.x; 
        this.eventData.dragPos.y = csrPosWC.y - this.eventData.grabCsrPos.y; 
        this.eventData.dragOfs.x = csrPosWC.x  - this.eventData.savPointerPos.x;
        this.eventData.dragOfs.y = csrPosWC.y  - this.eventData.savPointerPos.y;
        // To calculate the Z axis rotation about the target drawing origin
        // the cylinder radius is set by the cursor distance from the dwgOrg
        const csrX = csrPosWC.x - target.dwgOrg.x;
        const csrY = csrPosWC.y - target.dwgOrg.y;
        const angZ = Math.atan2(csrY*isoWC_to_yWC, csrX) * 180/Math.PI;
        this.eventData.dragAngle = angZ - this.eventData.grabAngle;  // angle in degs
        this.eventData.dragOfsAngle = this.eventData.dragAngle - this.eventData.savAngle;   // offset from grab

        this.dragCallback.call(this.cgo, this.eventData);   // call in the scope of the Cango context
      }
    }

    drop(event){
      this.topCvs.onmouseup = null;
      this.topCvs.onmouseout = null;
      this.topCvs.onmousemove = null;
      this.eventData.target.dNdActive = false;
      this.eventData.gc = this.cgo;
      if (this.dropCallback)
      {
        this.dropCallback.call(this.cgo, this.eventData);   // call in the scope of the Cango context
      }
    }
  }

  LinearGradient = class 
  {
    constructor(p1x, p1y, p2x, p2y)
    {
      this.grad = {x1:p1x, y1:p1y, x2:p2x, y2:p2y};
      this.colorStops = [];
    }
    
    addColorStop(stop, color)
    {
      this.colorStops.push({stop:stop, color:color});
    }
  }

  RadialGradient = class 
  { 
    constructor(p1x, p1y, r1, p2x, p2y, r2)
    {
      this.grad = {x1:p1x, y1:p1y, r1:r1, x2:p2x, y2:p2y, r2:r2};
      this.colorStops = [];
    }
  }

  class TfmDescriptor
  {
    constructor(type, ...argAry)  // type and the rest
    {
      this.type = type;
      this.args = argAry;  // other args as an array
    }
  }

  Group = class 
  {
    constructor(...args)
    {
      this.type = "GRP";                    // enum of type to instruct the render method
      this.parent = null;                   // pointer to parent Group (if not undefined)
      this.children = [];                   // only Groups have children
      this.dwgOrg = {x:0, y:0};             // drawing origin (0,0) may get translated
      this.ofsTfmAry = [];                  // soft transforms applied to this Group 
      this.ofsTfmMat = matrixIdent();       // ofsTfmsAry as a matrix, cleared after render 
      this.currOfsTfmMat = matrixIdent();
      this.netTfmMat = matrixIdent();       // inherited ofsTfmMat mult by own ofsTfmMat  
      this.dragNdropHandlers = null;        // array of DnD handlers to be passed to newly added children
      this.dNdActive = false;
      // add any objects passed by forwarding them to addObj
      this.addObj(args);  // args is an array from the constructor 'rest'
    }

    addObj(...args)  // the 'rest' returns an Array
    {
      const iterate = (argAry)=>{
        argAry.forEach((elem)=>{
          if (Array.isArray(elem))
          {
            iterate(elem);
          }
          else   // Obj2D or Group
          {
            if (!elem || (!types.includes(elem.type)))  // don't add undefined or non-Obj2D
            {
              console.warn("Type Error: Group.addObj: argument", elem);
              return;
            }
            elem.parent = this;            // now its a free agent link it to this group
            this.children.push(elem);
            // enable drag and drop if this group has drag
            if (!elem.dragNdrop && this.dragNdropHandlers)
            {
              elem.enableDrag.apply(elem, this.dragNdropHandlers);
              elem.dragNdrop.eventData.target = this;     // the Group is the target being dragged
            }
          }
        });
      }

      iterate(args);
    }

    dup()
    {
      const newGrp = new Group();
      this.children.forEach((childNode)=>{
        newGrp.addObj(childNode.dup());
      });

      return newGrp;
    }

   /*====================================================
    * Recursively add a Drag object to Obj2D descendants 
    * of a Group.
    * When rendered all these Obj2D will be added to 
    * dragObjects to be checked for mousedown events
    *---------------------------------------------------*/
    enableDrag(dragFn, grabFn, dropFn, cancelFn)
    {
      const iterate = (grp)=>{
        grp.children.forEach((childNode)=>{
          if (childNode.type === "GRP")
          {
            iterate(childNode);
          }
          else if (childNode.dragNdrop === null)    // don't over-write if its already assigned a handler
          {
            childNode.enableDrag(dragFn, grabFn, dropFn, cancelFn);
            childNode.dragNdrop.eventData.target = this;     // the Group is the target being dragged
          }
        });
      }

      this.dragNdropHandlers = arguments;
      iterate(this);
    }

    /*======================================
    * Disable dragging on Obj2D descendants
    *-------------------------------------*/
    disableDrag()
    {
      const iterate = (grp)=>{
        grp.children.forEach((childNode)=>{
          if (childNode.type === "GRP")
          {
            iterate(childNode);
          }
          else
          {
            childNode.disableDrag();
          }
        });
      }

      this.dragNdropHandlers = null;
      iterate(this);
    }

   /*======================================================
    * Recursively add a Drag object to Obj2D descendants 
    * of a Group.
    * When rendered all these Obj2D will be added to 
    * dragObjects to be checked for mouseup (click) events
    * and (optional) mousedown events
    *-----------------------------------------------------*/
   enableClick(clickFn, downEvtFn, cancelFn)
   {
     const iterate = (grp)=>{
        grp.children.forEach((childNode)=>{
          if (childNode.type === "GRP")
          {
            iterate(childNode);
          }
          else if (childNode.dragNdrop === null)    // don't over-write if its already assigned a handler
          {
            childNode.enableClick(clickFn, downEvtFn, cancelFn);
            childNode.dragNdrop.eventData.target = this;     // the Group is the target being clicked
          }
        });
      }

      this.dragNdropHandlers = [null, downEvtFn, clickFn, cancelFn];
      iterate(this);
    }

   /*======================================
    * Disable onclick for Obj2D descendants
    *-------------------------------------*/
    disableClick()
    {
      const iterate = (grp)=>{
        grp.children.forEach((childNode)=>{
          if (childNode.type === "GRP")
          {
            iterate(childNode);
          }
          else
          {
            childNode.disableClick();
          }
        });
      }

      this.dragNdropHandlers = null;
      iterate(this);
    }

   /*=========================================================
    * Add a translation transform to the Group's OfsTfmAry.
    *--------------------------------------------------------*/
    translate(x=0, y=0)
    {
      const trnsDstr = new TfmDescriptor("TRN", x, y);
      this.ofsTfmAry.push(trnsDstr);
      return this;
    }


   /*=========================================================
    * Add a rotation transform to the Group's OfsTfmAry.
    *--------------------------------------------------------*/
    rotate(degs=0)
    {
      const rotDstr = new TfmDescriptor("ROT", degs);
      this.ofsTfmAry.push(rotDstr);
      return this;
    }

    transformRestore()
    {
      const iterate = (grp)=>{
        grp.children.forEach((childNode)=>{
          if (childNode.type === "GRP")
          {
            childNode.transformRestore();
            iterate(childNode);
          }
          else  // Obj2D
          {
            childNode.transformRestore();
          }
        });
      }

      this.ofsTfmMat = matrixClone(this.currOfsTfmMat);

      iterate(this);
    }
  }      /*  Group */

  function setPropertyFn(propertyName, value)
  {
    const lorgVals = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    if ((typeof propertyName !== "string")||(value === undefined))
    {
      return;
    }

    switch (propertyName.toLowerCase())
    {
      case "fillrule":
        if (typeof value !== "string")
        {
          return;
        }
        if ((value === "evenodd")||(value ==="nonzero"))
        {
          this.fillRule = value;
        }
        break;
      case "fillcolor":
        this.fillCol = value;
        break;
      case "strokecolor":
        this.strokeCol = value;
        break;
      case "linewidth":
      case "strokewidth":      // for backward compatibility
        if ((typeof value === "number")&&(value > 0))
        {
          this.lineWidth = value;
        }
        break;
      case "linewidthwc":
        if ((typeof value === "number")&&(value > 0))
        {
          this.lineWidthWC = value;
        }
        break;
      case "linecap":
        if (typeof value !== "string")
        {
          return;
        }
        if ((value === "butt")||(value ==="round")||(value === "square"))
        {
          this.lineCap = value;
        }
        break;
      case "linejoin":
        if (typeof value !== "string")
        {
          return;
        }
        if ((value === "bevel")||(value ==="round")||(value === "miter"))
        {
          this.lineJoin = value;
        }
        break;
      case "iso":
      case "isotropic":
        if ((value == true)||(value === 'iso')||(value === 'isotropic'))
        {
          this.iso = true;
        }
        else
        {
          this.iso = false;
        }
        break;
      case "dashed":
        if (Array.isArray(value) && value[0])
        {
          this.dashed = value;
        }
        else     // ctx.setLineDash([]) will clear dashed settings
        {
          this.dashed = [];
        }
        break;
      case "dashoffset":
        this.dashOffset = value || 0;
        break;
      case "border":
        if (value === true)
        {
          this.border = true;
        }
        if (value === false)
        {
          this.border = false;
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
      case "fontfamily":
        if (typeof value === "string")
        {
          this.fontFamily = value;
        }
        break;
      case "bgfillcolor":
        this.bgFillColor = value;
        break;
      case "imgwidth":
        this.imgWidth = Math.abs(value);
        break;
      case "imgheight":
        this.imgHeight = Math.abs(value);
        break;
      case "lorg":
        if (lorgVals.indexOf(value) !== -1)
        {
          this.lorg = value;
        }
        break;
      case "shadowoffsetx":
        this.shadowOffsetX = value || 0;
        break;
      case "shadowoffsety":
        this.shadowOffsetY = value || 0;
        break;
      case "shadowblur":
        this.shadowBlur = value || 0;
        break;
      case "shadowcolor":
        this.shadowColor = value;
        break;
      case "skwH":
        {
          const skwHDstr = new TfmDescriptor("SKW", value, 0);
          this.hardTfmAry.push(skwHDstr);
        }
        break;
      case "skwV":
        {
          const skwVDstr = new TfmDescriptor("SKW", 0, value);
          this.hardTfmAry.push(skwVDstr);
        }
        break;
      case "scl":
        if (Array.isArray(value))
        {
          if (!value[0]) 
            {
              console.warn("Range Error: invalid scale value");
            }
            else
            {          
              const sclX = value[0];
              const sclY = (value[1])? value[1]: sclX;
              const sclDstr = new TfmDescriptor("SCL", sclX, sclY);
              this.hardTfmAry.push(sclDstr);
            }
        }
        else
        {
          if (!value) 
          {
            console.warn("Range Error: invalid scale value");
          }
          else
          {
            const scl = value;
            const sclDstr = new TfmDescriptor("SCL", scl, scl);
            this.hardTfmAry.push(sclDstr);
          }
        }
        break;
        case "rot":
          {
            const rotDstr = new TfmDescriptor("ROT", value);
            this.hardTfmAry.push(rotDstr);
          }
          break;
        case "x":
          {
            const trnsXDstr = new TfmDescriptor("TRN", value, 0);
            this.hardTfmAry.push(trnsXDstr);
          }
          break;
        case "y":
          {
            const trnsYDstr = new TfmDescriptor("TRN", 0, value);
            this.hardTfmAry.push(trnsYDstr);
          }
          break;
        case "flip":
        if (typeof value === "string")
        {
          if (value[0] == "v" || value[0] == "V")
          {
            const flpDstr = new TfmDescriptor("SCL", 1, -1);
            this.hardTfmAry.push(flpDstr);
          }
          else if (value[0] == "h" || value[0] == "H")
          {
            const flpDstr = new TfmDescriptor("SCL", -1, 1);
            this.hardTfmAry.push(flpDstr);
          }
        }
        break;
      default:
        break;
    }
  }

  function dupCommon(newObj, org)  // Object of the correct type
  {
    // duplicate the common prperties
    if (org.pthCmds.p2dWC)
    {
      newObj.pthCmds.p2dWC = new Path2D(org.pthCmds.p2dWC);
      newObj.pthCmds.length = org.pthCmds.length;
    }
    newObj.parent = null;                      // pointer to parent group if any
    newObj.dwgOrg = structuredClone(org.dwgOrg);
    newObj.hardTfmAry = structuredClone(org.hardTfmAry); // hard offset from any parent Group's transform
    // do not duplicate dynamic transform
    newObj.fillRule = org.fillRule;            // for SHAPE
    newObj.fillCol = org.fillCol;              // for SHAPE
    newObj.border = org.border;
    newObj.strokeCol = org.strokeCol;
    newObj.lineWidth = org.lineWidth;
    newObj.lineWidthWC = org.lineWidthWC;
    newObj.lineCap = org.lineCap;
    newObj.lineJoin = org.lineJoin;
    newObj.iso = org.iso;
    newObj.clearFlag = org.clearFlag;

    newObj.shadowOffsetX = org.shadowOffsetX;
    newObj.shadowOffsetY = org.shadowOffsetY;
    newObj.shadowBlur = org.shadowBlur;
    newObj.shadowColor = org.shadowColor;

    newObj.dashed = structuredClone(org.dashed);
    newObj.dashOffset = org.dashOffset;
    // The other objects are dynamic, calculated at render
  }

  class Obj2D
  { 
    constructor()
    {
      this.iso = true;                      // default for ClipMask, Shape, Img, Text
      this.parent = null;                   // pointer to parent Group if any
      this.dwgOrg = {x:0, y:0};             // drawing origin (0,0) may get translated
      this.ofsTfmAry = [];                  // soft transforms cleared after render
      this.ofsTfmMat = matrixIdent();       // ofsTfmsAry as a matrix, cleared after render 
      this.currOfsTfmMat = matrixIdent();   // copy of ofsTfmMat as drawn
      this.hardTfmAry = [];                 // hard transforms not cleared after render
      this.netTfm = matrixIdent();          // the transform matrix to be applied prior to rendering
      this.dragNdrop = null;
      this.dNdActive = false;
    }

    setStyleProperty(prop, val)
    {
      const transforms = ["x", "y", "rot", "scl", "flip"];

      if (!transforms.includes(prop.toLowerCase()))
      {
        setPropertyFn.call(this, prop.toLowerCase(), val);
      }
    }

    enableDrag(dragFn, grabFn, dropFn)
    {
      this.dragNdrop = new Drag2D("drag", dragFn, grabFn, dropFn);
      // fill in the Drag2D properties for use by callBacks
      this.dragNdrop.eventData.target = this;
    }

    disableDrag()
    {
      if (this.dragNdrop && this.dragNdrop.layer)
      {
        // remove this object from array to be checked on mousedown
        const aidx = this.dragNdrop.layer.dragObjects.indexOf(this);
        this.dragNdrop.layer.dragObjects.splice(aidx, 1);
        this.dragNdrop = null;
      }
    }

    enableClick(clickFn, downEvtFn, cancelFn)
    {
      this.dragNdrop = new Drag2D("click", null, downEvtFn, clickFn, cancelFn);
      // fill in the Drag2D properties for use by callbacks
      this.dragNdrop.eventData.target = this;
    }

    disableClick()
    {
      this.disableDrag();
    }

   /*=========================================================
    * Add a translation transform to the Obj2D's OfsTfmAry.
    *--------------------------------------------------------*/
    translate(x=0, y=0)
    {
      const trnsDstr = new TfmDescriptor("TRN", x, y);
      this.ofsTfmAry.push(trnsDstr);
      return this;
    }

    transformRestore()
    {
      this.ofsTfmMat = matrixClone(this.currOfsTfmMat);
    }
  }

  ClipMask = class extends Obj2D
  {  
    constructor(pathDef, opt = {})
    {
      super();
      this.type = "CLIP";
      this.pthCmds = new Path2DObj();   
      this.fillRule = "nonzero";
      this.fillCol = null;
      this.border = false;    // ClipMask can have a border (half width showing)
      this.strokeCol = null;
      this.lineWidth = null;
      this.lineWidthWC = null;
      this.lineCap = null;
      this.lineJoin = null;
      this.savScale = 1; 
      // drop shadow properties
      this.shadowOffsetX = 0;
      this.shadowOffsetY = 0;
      this.shadowBlur = 0;
      this.shadowColor = "#000000";
      // dashed line properties
      this.dashed = [];
      this.dashOffset = 0;
  
      this.setDescriptor(pathDef);   // sets this.pthCmds

      for (const prop in opt)
      {
        if (opt[prop] !== undefined) // own property, not inherited from prototype
        {
          setPropertyFn.call(this, prop, opt[prop]);
        }   
      }
    }

    setDescriptor(commands)
    {
      if (typeof PathSVG !== 'undefined' && PathSVG !== null && commands instanceof PathSVG)
      {
        const str = commands.toString(5);
        this.pthCmds.p2dWC = new Path2D(str);
        this.pthCmds.length = str.length;  // used for warning if length == 0
      }
      else if (commands instanceof Path2D)
      {
        this.pthCmds.p2dWC = commands;
        // to detect draw empty objects set the length pthCmds.length=0 this will generate a warning
        this.pthCmds.length = 1;
      }
      else if ((typeof commands === "string") && commands.length)  // a string will be svg commands
      {
        const pathStr = commands.replace(/\,/g, " ");  // commas cause trouble, replace with spaces
        this.pthCmds.p2dWC = new Path2D(pathStr);
        this.pthCmds.length = pathStr.length;    // used for warning if length == 0
      }
      else if (commands && commands.length)  // non-empty array 
      {
        // check typed Array views etc, convert to real Array
        if (ArrayBuffer.isView(commands))    
        {
          commands = Array.from(commands);  
        }
        if (Array.isArray(commands))
        {
          let str = "";
          if (typeof(commands[0]) === "number")  // its an Array of numbers
          {
            str = "M "+commands.join(" ");  // insert 'M' command so its valid SVG
            this.pthCmds.p2dWC = new Path2D(str);
          }
          else
          {
            str = commands.join(" "); 
            this.pthCmds.p2dWC = new Path2D(str);  // simple conversion to svg String
          }
          this.pthCmds.length = str.length;  // used for warning if length == 0
        }
      }
    }

    getProperty(propName)
    {
      return getPropertyFn.call(this, propName);
    }

    dup()
    {
      const newObj = new ClipMask();
      dupCommon(newObj, this); 
      // The other objects are dynamic, calculated at render
  
      return newObj;         // return a object which inherits Obj2D properties
    }

    paint(gc)
    {
      // if empty array was passed as mask definition then reset clip to full canvas
      if (!this.pthCmds.length)
      {
        gc.resetClip();
        return;
      }
  
      gc.ctx.save();   // save context which has no clip mask (not restored locally)
      gc.clipCount += 1;
      this.pthCmds.p2dPX = new Path2D();
      this.pthCmds.p2dPX.addPath(this.pthCmds.p2dWC, this.netTfm);   // scaled to pixels for raw canvas coords
      gc.ctx.clip(this.pthCmds.p2dPX, this.fillRule);  // activate the clip mask, context is raw pixels default styles
    } 
  }

  Path = class extends ClipMask
  {
    constructor(commands, opt = {})
    {
      super(commands, opt);
      this.type = "PATH";               // type string to instruct the render method
      // only other difference is the default value for 'iso' property
      if (opt["iso"] !== undefined)
      {
        this.setStyleProperty("iso", opt.iso);
      }
      else if (opt["isotropic"] !== undefined)
      {
        this.setStyleProperty("iso", opt.isotropic);
      }
      else
      {
        this.iso = false;   // default false
      }
    }

    dup(){
      const newObj = new Path();
      dupCommon(newObj, this);

      return newObj;
    }

    paint(gc)
    {
      if (!this.pthCmds.length)
      {
        console.warn("Type Error: render Path descriptor");
        return;
      }
        
      // set up all the color 
      const col = this.strokeCol || gc.strokeColDef;
      let stkCol = col;
      if (col instanceof LinearGradient)
      {
        stkCol = gc.genLinGradPX(col, this);
      }
      else if (col instanceof RadialGradient)
      {
        stkCol = gc.genRadGradPX(col, this);
      }
      gc.ctx.save();   // save raw pixel context
      // apply the transforms and map from world to pixel coords
      this.pthCmds.p2dPX = new Path2D();
      this.pthCmds.p2dPX.addPath(this.pthCmds.p2dWC, this.netTfm);   // scale to pixels to use for stroke()
      gc.ctx.restore();  // back to raw pixels
      
      gc.ctx.save();   // save default styles, still raw pixels
      gc.dropShadow(this);    // set up dropShadow if any
  
      if (this.border) // use drop shadows for Path not border
      {
        gc.dropShadow(); 
      }
      // handle dashed lines
      if (Array.isArray(this.dashed) && this.dashed.length)
      {
        gc.ctx.setLineDash(this.dashed);
        gc.ctx.lineDashOffset = this.dashOffset || 0;
      }
      if (!this.orgXscl) this.orgXscl = gc.xscl;
      const zmScl = gc.xscl/this.orgXscl;
      // support for zoom and pan changing line width
      if (this.lineWidthWC)
      {
        gc.ctx.lineWidth = this.lineWidthWC*this.savScale*gc.xscl;   // lineWidth in world coords so scale to px
      }
      else
      {
        gc.ctx.lineWidth = this.lineWidth*zmScl || gc.lineWidthDef*zmScl; // lineWidth in pixels (/orgXscl to get to WC)
      }
      gc.ctx.strokeStyle = stkCol;
      gc.ctx.lineCap = this.lineCap || gc.lineCapDef;
      gc.ctx.lineJoin = this.lineJoin || gc.lineJoinDef;
      gc.ctx.stroke(this.pthCmds.p2dPX); // stroke the current path
      gc.ctx.setLineDash([]);            // clean up dashes (they are not reset by save/restore)
      gc.ctx.lineDashOffset = 0;
      gc.ctx.restore();                  // back to default styles, still raw pixels
  
      if (this.dragNdrop !== null)
      {
        initDragAndDrop(gc);
        gc.handleDnD(this);
      }
    } 
  }

  Shape = class extends ClipMask
  {
    constructor(commands, opt = {})
    {
      super(commands, opt);
      this.type = "SHAPE";
      this.clearFlag = false;  // private flag for clearShape method
    }

    dup(){
      const newObj = new Shape();
      dupCommon(newObj, this);

      return newObj;
    }

    paint(gc)
    {
      if (!this.pthCmds.length)
      {
        console.warn("Type Error: render Shape descriptor");
        return;
      }

      // set up all the colors
      let col = this.fillCol || gc.fillColDef;
      let filCol = col;
      if (col instanceof LinearGradient)
      {
        filCol = gc.genLinGradPX(col, this);
      }
      else if (col instanceof RadialGradient)
      {
        filCol = gc.genRadGradPX(col, this);
      }
      gc.ctx.save();   // save raw pixel context
      // apply the transforms and map from world to pixel coords
      this.pthCmds.p2dPX = new Path2D();
      this.pthCmds.p2dPX.addPath(this.pthCmds.p2dWC, this.netTfm);   // scale to pixels to use for stroke()
      gc.ctx.restore();  // back to raw pixels
      
      gc.ctx.save();   // save default styles, still raw pixels
      gc.dropShadow(this);    // set up dropShadow if any
      if (this.clearFlag)
      {
        gc.ctx.save();  
        gc.ctx.globalCompositeOperation = "destination-out";  // clear canvas inside the this
        gc.ctx.fill(this.pthCmds.p2dPX, this.fillRule);
        //=============================================================================
        // Workaround for Chrome/Edge bug: "ragged edge on destination-out fill"
        gc.ctx.lineWidth = 1.5;
        gc.ctx.stroke(); 
        //=============================================================================
        gc.ctx.restore();
      }
      else
      {
        gc.ctx.fillStyle = filCol;
        gc.ctx.fill(this.pthCmds.p2dPX, this.fillRule);
      }
  
      if (this.border)
      {
        gc.dropShadow(); 
        col = this.strokeCol || gc.strokeColDef;
        let stkCol = col;
        if (col instanceof LinearGradient)
        {
          stkCol = gc.genLinGradPX(col, this);
        }
        else if (col instanceof RadialGradient)
        {
          stkCol = gc.genRadGradPX(col, this);
        }
        // handle dashed lines
        if (Array.isArray(this.dashed) && this.dashed.length)
        {
          gc.ctx.setLineDash(this.dashed);
          gc.ctx.lineDashOffset = this.dashOffset || 0;
        }
        // support for zoom and pan changing line width
        if (!this.orgXscl) this.orgXscl = gc.xscl;
        const zmScl = gc.xscl/this.orgXscl;
        if (this.lineWidthWC)   // lineWidth in world coords
        {
          gc.ctx.lineWidth = this.lineWidthWC*this.savScale*gc.xscl; // scale to px
        }
        else  // lineWidth in pixels
        {
          gc.ctx.lineWidth = this.lineWidth*zmScl || gc.lineWidthDef*zmScl;
        }
 
        gc.ctx.strokeStyle = stkCol;
        gc.ctx.lineCap = this.lineCap || gc.lineCapDef;
        gc.ctx.lineJoin = this.lineJoin || gc.lineJoinDef;
        gc.ctx.stroke(this.pthCmds.p2dPX);
        gc.ctx.setLineDash([]);   // clean up dashes (they are not reset by save/restore)
        gc.ctx.lineDashOffset = 0;
      }
      gc.ctx.restore();           // back to default styles, still raw pixels
  
      if (this.dragNdrop !== null)
      {
        initDragAndDrop(gc);
        gc.handleDnD(this);
      }
    }  
  }

  Img = class extends Obj2D
  {
    constructor(imgDef, opt = {})
    {
      super();
      this.type = "IMG";

      this.srcX = 0;    // these get changed if Image cropped
      this.srcY = 0;    // so they shouldn't be initialize after setDescriptor
      this.srcWid = 0;
      this.srcHgt = 0;

      this.setDescriptor(imgDef);

      this.pthCmds = new Path2DObj();   // Path2D holding the img bounding box
      this.width = 0;                   // only used for type = IMG, TEXT, set to 0 until image loaded
      this.height = 0;                  //     "
      this.imgWidth = 0;                // user requested width in WC
      this.imgHeight = 0;               // user requested height in WC
      this.imgLorgX = 0;                // only used for type = IMG, TEXT, set to 0 until image loaded
      this.imgLorgY = 0;                //     "
      this.lorg = 1;                    // used by IMG and TEXT to set drawing origin
      // properties set by setStyleProperty method, if undefined render uses Cango default
      this.border = false;              // true = stroke outline with strokeColor & lineWidth
      this.strokeCol = null;            // render will stroke a path or border in this color
      this.lineWidthWC = null;          // border width world coords
      this.lineWidth = null;            // border width pixels
      this.lineCap = null;              // round, butt or square
      this.lineJoin = null;             // bevel, round, or miter
      this.savScale = 1;                // save accumulated scale factors for lineWidth of border
      // drop shadow properties
      this.shadowOffsetX = 0;
      this.shadowOffsetY = 0;
      this.shadowBlur = 0;
      this.shadowColor = "#000000";
      // dashed line properties
      this.dashed = [];
      this.dashOffset = 0;

      for (const prop in opt)
      {
        if (opt[prop] !== undefined) // own property, not inherited from prototype
        {
          setPropertyFn.call(this, prop, opt[prop]);
        }
      }
    }

    setDescriptor(imgData)
    {
      if (typeof imgData === "string")
      {
        this.imgBuf = new Image();    // pointer to the Image object when image is loaded
        this.imgBuf.src = imgData;    // start loading the image immediately
        return;
      }
      if ((imgData instanceof Image)||(imgData instanceof HTMLCanvasElement))
      {
        this.imgBuf = imgData;
        return;
      }
      console.warn("Type Error: Img descriptor");
    }

    dup()
    {
      const newObj = new Img(this.imgBuf);   // just copy reference
      dupCommon(newObj, this);

      newObj.srcX = this.srcX;
      newObj.srcY = this.srcY;
      newObj.srcWid = this.srcWid;
      newObj.srcHgt = this.srcHgt;
      newObj.width = this.width;
      newObj.height = this.height;
      newObj.imgWidth = this.imgWidth;
      newObj.imgHeight = this.imgHeight;
      newObj.imgLorgX = this.imgLorgX;
      newObj.imgLorgY = this.imgLorgY;
      newObj.lorg = this.lorg;
      // The other properties are dynamic, calculated at render

      return newObj;         // return a object which inherits Obj2D properties
    }
  
    crop(sx=0, sy=0, sWid=0, sHgt=0)
    {
      const croppedImg = new Img(this.imgBuf);

      croppedImg.srcX = sx;
      croppedImg.srcY = sy;
      croppedImg.srcWid = sWid;  
      croppedImg.srcHgt = sHgt;

      return croppedImg;
    }

    paintImg(gc)
    {
      if (!this.orgXscl) 
      {
        this.orgXscl = gc.xscl;
      } 
      const wcAspectRatio = Math.abs(gc.yscl/gc.xscl);
      let wid, hgt, 
          dx = 0,
          dy = 0;

      this.iso = true;   // over-ride any iso=false (rotation fails with no-iso pics)
      if (!this.imgBuf.width)
      {
        console.warn("Error: in image onload handler yet image NOT loaded!");
        return;
      }
      // setup the crop dimension if any
      const crpX = (this.srcX > 0)? Math.min(this.srcX, this.imgBuf.width-this.srcWid): 0;
      const crpY = (this.srcY > 0)? Math.min(this.srcY, this.imgBuf.height-this.srcHgt): 0;
      const crpWid = (this.srcWid > 0)? Math.min(this.imgBuf.width - crpX, this.srcWid): this.imgBuf.width;
      const crpHgt = (this.srcHgt > 0)? Math.min(this.imgBuf.height - crpY, this.srcHgt): this.imgBuf.height; 
      this.srcX = crpX;
      this.srcY = crpY;
      this.srcWid = crpWid;
      this.srcHgt = crpHgt;

      if (this.imgWidth && this.imgHeight)
      {
        wid = this.imgWidth;
        hgt = this.imgHeight*wcAspectRatio;
      }
      else if (this.imgWidth && !this.imgHeight)  // width only passed height is auto
      {
        wid = this.imgWidth;
        hgt = wid*this.srcHgt/this.srcWid;        // keep aspect ratio, use x units
      }
      else if (this.imgHeight && !this.imgWidth)  // height only passed width is auto
      {
        hgt = this.imgHeight*wcAspectRatio;
        wid = hgt*this.srcWid/this.srcHgt;        // keep aspect ratio
      }
      else    // no width or height default to natural size;
      {
        wid = this.srcWid/this.orgXscl;     // default to natural width if none passed
        hgt = wid*this.srcHgt/this.srcWid;  // keep aspect ratio, use x units
      }

      const wid2 = wid/2;
      const hgt2 = hgt/2;
      const lorgWC = [0, [0,    0], [wid2,    0], [wid,    0],
                         [0, hgt2], [wid2, hgt2], [wid, hgt2],
                         [0,  hgt], [wid2,  hgt], [wid,  hgt]];
      if (lorgWC[this.lorg] !== undefined)
      {
        dx = -lorgWC[this.lorg][0];
        dy = -lorgWC[this.lorg][1];
      }
      this.imgLorgX = dx;     // world coords offset to drawing origin
      this.imgLorgY = dy;
      this.width = wid;       // default to natural width if none passed
      this.height = hgt;      // default to natural height if none passed
      // construct the draw cmds for the Img bounding box
      const ulx = dx;
      const uly = dy;
      const llx = dx;
      const lly = dy+hgt;
      const lrx = dx+wid;
      const lry = dy+hgt;
      const urx = dx+wid;
      const ury = dy;
      const cmdsAry = "M"+ulx+" "+uly+" L"+llx+" "+lly+" "+lrx+" "+lry+" "+urx+" "+ury+" Z";
      this.pthCmds.p2dWC = new Path2D(cmdsAry);
      this.pthCmds.length = cmdsAry.length;
  
      // should only be called after image has been loaded into imgBuf
      const img = this.imgBuf;  // this is the place the image is stored in object
  
      gc.ctx.save();   // save raw pixels context, default styles no dropShadow
      gc.ctx.setTransform(this.netTfm.a, this.netTfm.b, this.netTfm.c, this.netTfm.d, this.netTfm.e, this.netTfm.f);
  
      gc.dropShadow(this);  // set up dropShadow if any
      // now insert the image canvas ctx will apply transforms (width etc in WC)
      gc.ctx.drawImage(img, this.srcX, this.srcY, this.srcWid, this.srcHgt, this.imgLorgX, this.imgLorgY, this.width, this.height);
      if (this.border)
      {
        gc.dropShadow(); // clear dropShadow, dont apply to the border (it will be on top of fill)
        // create the path to stroke with transforms applied to Path2D, not to canvas, else lineWidth scales non-iso!
        this.pthCmds.p2dPX = new Path2D();
        this.pthCmds.p2dPX.addPath(this.pthCmds.p2dWC, this.netTfm);
        gc.ctx.restore();   // revert to raw pixels ready to stroke border
        gc.ctx.save();      // save context with default styles 
        const col = this.strokeCol || gc.strokeColDef;
        let stkCol = col;
        if (col instanceof LinearGradient)
        {
          stkCol = gc.genLinGradPX(col, this);
        }
        else if (col instanceof RadialGradient)
        {
          stkCol = gc.genRadGradPX(col, this);
        }
        if (!this.orgXscl) this.orgXscl = gc.xscl;
        const zmScl = gc.xscl/this.orgXscl;
        if (this.lineWidthWC)
        {
          gc.ctx.lineWidth = this.lineWidthWC*this.savScale*gc.xscl;   // lineWidth in world coords so scale to px
        }
        else
        {
          gc.ctx.lineWidth = this.lineWidth*zmScl || gc.lineWidthDef*zmScl; 
        }
        gc.ctx.strokeStyle = stkCol;
        // if properties are undefined use Cango default
        gc.ctx.lineCap = this.lineCap || gc.lineCapDef;
        gc.ctx.lineJoin = this.lineJoin || gc.lineJoinDef;
        gc.ctx.stroke(this.pthCmds.p2dPX);
      }
      gc.ctx.restore();     // back to raw pixels and default styles

      if (this.dragNdrop !== null)
      {
        initDragAndDrop(gc);
        gc.handleDnD(this);
      }
    }
  
    paint(gc)
    {
      const imgLoaded = ()=>{ 
        this.paintImg(gc);
      }

      if (this.imgBuf.complete || this.imgBuf instanceof HTMLCanvasElement)    // see if already loaded
      {
        imgLoaded();
      }
      else
      {
        this.imgBuf.addEventListener('load', imgLoaded);
      }
    }
  } 

  Text = class extends Obj2D
  {
    constructor (txtString, opt = {})
    {
      super();
      this.type = "TEXT";               // type string to instruct the render method
      this.txtStr = "";                 // store the text String
      this.pthCmds = new Path2DObj();   // Path2D that draws the text bounding box
      this.width = 0;                   // only used for type = IMG, TEXT, set to 0 until image loaded
      this.height = 0;                  //     "
      this.imgLorgX = 0;                //     "
      this.imgLorgY = 0;                //     "
      this.lorg = 1;                    // used by IMG and TEXT to set drawing origin
      // properties set by setStyleProperty method, if undefined render uses Cango default
      this.border = false;              // true = stroke outline with strokeColor & lineWidth
      this.fillCol = null;              // only used if type == SHAPE or TEXT
      this.bgFillColor = null;          // only used if type = TEXT
      this.strokeCol = null;            // render will stroke a border in this color
      this.fontSize = null;             // fontSize in pixels (TEXT only)
      this.fontSizeWC = null;           // fontSize in world coords (TEXT only)
      this.fontWeight = null;           // fontWeight 100..900 (TEXT only)
      this.fontFamily = null;           // (TEXT only)
      this.lineWidthWC = null;          // border width world coords
      this.lineWidth = null;            // border width pixels
      this.lineCap = null;              // round, butt or square
      this.lineJoin = null;             // bevel, round or miter
      this.savScale = 1;                // save accumulated scale factors to scale lineWidth of border 
      // drop shadow properties
      this.shadowOffsetX = 0;
      this.shadowOffsetY = 0;
      this.shadowBlur = 0;
      this.shadowColor = "#000000";
      // dashed line properties
      this.dashed = [];
      this.dashOffset = 0;

      this.setDescriptor(txtString);

      for (const prop in opt)
      {
        if (opt[prop] !== undefined)   // own property, not inherited from prototype
        {
          setPropertyFn.call(this, prop, opt[prop]);
        }
      }
    }

    setDescriptor(str)
    {
      if (typeof str !== "string")
      {
        console.warn("Type Error: Text descriptor");
        return;
      }
      this.txtStr = str;
    }

    dup()
    {
      const newObj = new Text(this.txtStr.slice(0));
      dupCommon(newObj, this)

      newObj.bgFillColor = this.bgFillColor;
      newObj.width = this.width;
      newObj.height = this.height;
      newObj.imgLorgX = this.imgLorgX;
      newObj.imgLorgY = this.imgLorgY;
      newObj.lorg = this.lorg;
      newObj.fontSize = this.fontSize;
      newObj.fontSizeWC = this.fontSizeWC;
      newObj.fontWeight = this.fontWeight;
      newObj.fontFamily = this.fontFamily;
      // The other properties are dynamic, calculated at render

      return newObj;
    }

    paint(gc)
    {
      const fntFm = this.fontFamily || gc.fontFamilyDef,
            fntWt = this.fontWeight || gc.fontWeightDef,
            lorg = this.lorg || 1;
      let fntSz,      // font size in pixels, Note: char cell is ~1.4*fontSize pixels high
          dx = 0,
          dy = 0;

          // support for zoom and pan
      const zmScl = gc.xscl/gc.savWCscl.xscl;   // scale for any zoom factor
      if (this.fontSizeWC)
      {
        fntSz = this.fontSizeWC*gc.savWCscl.xscl;   // fontSize in world coords so scale to px
      }
      else
      {
        fntSz = this.fontSize || gc.fontSizeDef 
      }
      // set the drawing context to measure the size
      gc.ctx.save();
      gc.ctx.resetTransform();  // reset to identity matrix
      gc.ctx.font = fntWt+" "+fntSz*zmScl+"px "+fntFm;
      const wid = gc.ctx.measureText(this.txtStr).width;  // width in pixels
      gc.ctx.restore();
      // keep in pixel dimensions (Img and Text are drawn in px dimensions, avoiding font size rounding) 
      const hgt = fntSz*zmScl;    // TEXT height from bottom of decender to top of capitals
      const wid2 = wid/2;
      const hgt2 = hgt/2;
      const lorgWC = [[0, 0], [0,  hgt], [wid2,  hgt], [wid,  hgt],
                              [0, hgt2], [wid2, hgt2], [wid, hgt2],
                              [0,    0], [wid2,    0], [wid,    0]];
      if (lorgWC[lorg] !== undefined)
      {
        dx = -lorgWC[lorg][0];
        dy = lorgWC[lorg][1];
      }
      this.imgLorgX = dx;           // pixel offsets to drawing origin
      this.imgLorgY = dy-0.25*hgt;  // correct for alphabetic baseline, its offset about 0.25*char height

      // construct the cmdsAry for the text bounding box (world coords)
      const ulx = dx;
      const uly = dy;
      const llx = dx;
      const lly = dy-hgt;
      const lrx = dx+wid;
      const lry = dy-hgt;
      const urx = dx+wid;
      const ury = dy;
      const cmdsAry = "M"+ulx+" "+uly+" L"+llx+" "+lly+" "+lrx+" "+lry+" "+urx+" "+ury+" Z";
      this.pthCmds.p2dWC = new Path2D(cmdsAry);
      this.pthCmds.length = cmdsAry.length;    // used for warning if length == 0
      // set up the fill and stroke colors, gradients will be rendered in world coords 
      let col = this.strokeCol || gc.strokeColDef;
      let stkCol = col;
      if (col instanceof LinearGradient)
      {
        stkCol = gc.genLinGradWC(col);
      }
      else if (col instanceof RadialGradient)
      {
        stkCol = gc.genRadGradWC(col); 
      }
  
      col = this.fillCol || gc.fillColDef;
      let filCol = col;
      if (col instanceof LinearGradient)
      {
        filCol = gc.genLinGradWC(col);
      }
      else if (col instanceof RadialGradient)
      {
        filCol = gc.genRadGradWC(col); 
      }
  
      let bkgCol;
      if (this.bgFillColor)  // leave bkg = undefined if no bgFillColor set
      {
        col = this.bgFillColor;
        if (typeof col === "string")
        {
          bkgCol = this.bgFillColor;
        }
        else if (col instanceof LinearGradient)
        {
          bkgCol = gc.genLinGradWC(col);
        }
        else if (col instanceof RadialGradient)
        {
          bkgCol = gc.genRadGradWC(col); 
        }
      }
    
      gc.ctx.save();   // save raw canvas no transforms no dropShadow
      gc.ctx.setTransform(this.netTfm.a, this.netTfm.b, this.netTfm.c, this.netTfm.d, this.netTfm.e, this.netTfm.f);
      // if a bgFillColor is specified then fill the bounding box before rendering the text
      if (bkgCol)
      {
        // create the bounding box path
        gc.ctx.save();
        gc.ctx.fillStyle = bkgCol;
        gc.ctx.strokeStyle = bkgCol;
        gc.ctx.lineWidth = 0.10*fntSz;  // expand by 5% (10% width gives 5% outside outline)
        gc.ctx.fill(this.pthCmds.p2dWC);
        gc.ctx.stroke(this.pthCmds.p2dWC); // stroke the outline
  
        gc.ctx.restore();
      }
      // now draw the text in world coords
      gc.ctx.font = fntWt+" "+hgt+"px "+fntFm;

      gc.ctx.fillStyle = filCol;
      gc.ctx.fillText(this.txtStr, this.imgLorgX, this.imgLorgY); // imgLorgX,Y are in pixels for text
      if (this.border)
      {
        gc.dropShadow(); // clear dropShadow, dont apply to the border (it will be on top of fill)
        // support for zoom and pan changing lineWidth
        if (this.lineWidthWC)
        {
          gc.ctx.lineWidth = this.lineWidthWC*gc.xscl*zmScl;
        }
        else
        {
          gc.ctx.lineWidth = this.lineWidth*zmScl || gc.lineWidthDef*zmScl;
        }
        // if properties are undefined use Cango default
        gc.ctx.strokeStyle = stkCol;
        gc.ctx.lineCap = this.lineCap || gc.lineCapDef;
        gc.ctx.lineJoin = this.lineJoin || gc.lineJoinDef;
        gc.ctx.strokeText(this.txtStr, this.imgLorgX, this.imgLorgY);
      }
      gc.ctx.restore();  // back to raw pixels and default styles

      if (this.dragNdrop !== null)
      {
        initDragAndDrop(gc);
        gc.handleDnD(this);
      }
    }
  } 

  class Layer
  {
    constructor(canvasID, canvasElement)
    {
      this.id = canvasID;
      this.cElem = canvasElement;
      this.dragObjects = [];
    }
  }

  function getLayer(cgo)
  {
    let lyr = cgo.bkgCanvas.layers[0];

    for (let i=1; i < cgo.bkgCanvas.layers.length; i++)
    {
      if (cgo.bkgCanvas.layers[i].id === cgo.cId)
      {
        lyr = cgo.bkgCanvas.layers[i];
        break;
      }
    }
    return lyr;    // Layer object
  }

  Cango = class 
  {
    constructor(cvs)
    {
      const resizeLayers = ()=>
      {
        // every Cango instance on the bkgCanvas will call this handler, only need to fix things once
        const t = this.bkgCanvas.offsetTop + this.bkgCanvas.clientTop,
              l = this.bkgCanvas.offsetLeft + this.bkgCanvas.clientLeft,
              w = this.bkgCanvas.offsetWidth,
              h = this.bkgCanvas.offsetHeight;

        // check if canvas is resized when window -resized, allow some rounding error in layout calcs
        if ((Math.abs(w - this.rawWidth)/w < 0.01) && (Math.abs(h - this.rawHeight)/h < 0.01))
        {
          // canvas size didn't change (or has already been resized already) so return
          return;
        }
        // canvas has been resized so re-size all the overlay canvases
        // kill off any animations on resize (else they still contiune along with any new ones)
        if (this.bkgCanvas.timeline && this.bkgCanvas.timeline.animTasks.length) // this is only called once
        {
          this.deleteAllAnimations();
        }
        // fix all Cango contexts to know about new size
        this.rawWidth = w;
        this.rawHeight = h;
        this.aRatio = w/h;
        // now every Cango instance has the new size (but their canvas haven't heard yet)
        // there may be multiple Cango contexts a layer, so this resize may be called multiple times
        if (this.cnvs.width == w && this.cnvs.height == h) // canvas already fixed so return
        {
          return;
        }
        this.bkgCanvas.width = w;    // reset canvas pixels width
        this.bkgCanvas.height = h;   // don't use style for this, all drawing will be erased
        // step through the stack of canvases (if any)
        for (let j=1; j<this.bkgCanvas.layers.length; j++)  // bkg is layer[0]
        {
          const ovl = this.bkgCanvas.layers[j].cElem;
          if (ovl)
          {
            ovl.style.top = t+'px';
            ovl.style.left = l+'px';
            ovl.style.width = w+'px';
            ovl.style.height = h+'px';
            ovl.width = w;    // reset canvas attribute to pixel width
            ovl.height = h;  
          }
        }
        // if zoom pan is enabled reset it
        if (this.bkgCanvas.zNp)
        {
          this.bkgCanvas.zNp.drawZnPcontrols();
          this.bkgCanvas.zNp.resize(w, h);
        }
      }

      if ((typeof cvs === "string") && document.getElementById(cvs))   // element ID was passed
      {
        this.cnvs = document.getElementById(cvs);
        this.cId = cvs;
        if (!(this.cnvs instanceof HTMLCanvasElement))  // not a canvas
        {
          console.warn("Type Error: Cango constructor argument not an HTMLCanvasElement");
          return;
        }
        // check if this is a context for an overlay
        if (this.cId.indexOf("_ovl_") !== -1)
        {
          this.cgoType = "OVL"; 
          // this is an overlay. get a reference to the backGround canvas
          const bkgId = this.cId.slice(0, this.cId.indexOf("_ovl_"));
          this.bkgCanvas = document.getElementById(bkgId);
        }
        else
        {
          this.cgoType = "BKG"; 
          this.bkgCanvas = this.cnvs;
        }
        this.rawWidth = this.cnvs.offsetWidth;    // ignore attribute, use the on screen pixel size
        this.rawHeight = this.cnvs.offsetHeight;
        if (this.bkgCanvas.unique === undefined)
        {
          this.bkgCanvas.unique = 0;
        }    
      }
      else if (cvs instanceof HTMLCanvasElement)   // canvas element passed
      {
        this.cnvs = cvs;
        this.bkgCanvas = this.cnvs;
        this.rawWidth = this.cnvs.width;
        this.rawHeight = this.cnvs.height;
        if (!this.bkgCanvas.unique === undefined)
        {
          this.bkgCanvas.unique = 0;
        }    
        if (document.contains(cvs))  // element is part of the DOM
        {
          this.cId = this.cnvs.id;
          this.cgoType = "BKG"; 
          if (!this.cId)
          {
            this.cId = "_bkg_"+this.getUnique();
            this.cnvs.id = this.cId;    // set the attribute to match new id
          }
        }
        else  // off-screen canvas
        {
          this.cId = "_os_"+this.getUnique();  // over-ride any existing id
          this.cgoType = "OS";     
        }
      }
      else  // not a canvas element
      {
        console.warn("Type Error: Cango constructor argument 1");
        return;
      }

      this.aRatio = this.rawWidth/this.rawHeight;
      this.widthPW = 100;                 // width of canvas in Percent Width coords
      this.heightPW = 100/this.aRatio;    // height of canvas in Percent Width coords
      if (this.bkgCanvas.layers === undefined)
      {
        // create an array to hold all the overlay canvases for this canvas
        this.bkgCanvas.layers = [];
        // make a Layer object for the bkgCanvas
        const bkgL = new Layer(this.cId, this.cnvs);
        this.bkgCanvas.layers[0] = bkgL;
        // make sure the overlay canvases always match the bkgCanvas size
        if (this.cgoType !== "OS")
        {
          addEventListener("resize", resizeLayers);
        }
      }
      if (this.cnvs.resized === undefined)
      {
        // make canvas native aspect ratio equal style box aspect ratio.
        // Note: rawWidth and rawHeight are floats, assignment to ints will truncate
        this.cnvs.width = this.rawWidth;          // reset canvas pixels width
        this.cnvs.height = this.rawHeight;        // don't use style for this
        this.cnvs.resized = true;
      }
      this.ctx = this.cnvs.getContext('2d');      // draw direct to screen canvas
      this.vpW = this.rawWidth;                   // gridbox width in pixels (no gridbox, use full canvas)
      this.vpH = this.rawHeight;                  // gridbox height in pixels, canvas height = width/aspect ratio
      this.vpOrgX = 0;                            // gridbox origin in pixels (upper left for SVG, the default)
      this.vpOrgYsvg = 0;                         // save vpOrgY, needed when switching between RHC and SVG and back
      this.vpOrgYrhc = this.rawHeight;            //   "
      this.vpOrgY = this.vpOrgYsvg;               // gridbox origin in pixels (upper left for SVG, the default)
      this.vpOrgXWC = this.vpOrgX;                // gridbox origin in world coords (upper left for SVG, the default)
      this.vpOrgYWC = this.vpOrgYsvg              //   ""
      this.vpWWC = this.vpW;                      // gridbox width in world coords (default use pixels) 
      this.vpHWC = this.vpH;                      // gridbox height in world coords (default use pixels)
      this.xscl = 1.0;                            // world x axis scale factor, default: pixels
      this.yscl = 1.0;                            // world y axis scale factor, +ve down (SVG style default)
      this.yDown = true;                          // set by setWordlCoordsRHC & setWorldCoordsSVG (SVG is default)
      this.isoYscl = this.xscl;                   // drawing is done with iso coords (updated prior to render)
      this.xoffset = 0;                           // world x origin offset from gridbox left in pixels
      this.yoffset = 0;                           // world y origin offset from gridbox bottom in pixels
      this.zNp = null;
      this.savWCscl = {xscl:this.xscl, yscl:this.yscl, xoffset:this.xoffset, yoffset:this.yoffset };     // save world coords for zoom/pan
      this.savGB = {lft: 0, bot: 0, spanX: 100, spanY: this.heightPW};
      this.ctx.textAlign = "left";                // all offsets are handled by lorg facility
      this.ctx.textBaseline = "alphabetic";
      this.strokeColDef = "rgba(0, 0, 0, 1.0)";   // black
      this.lineWidthDef = 1;                      // 1 pixel
      this.lineCapDef = "butt";
      this.lineJoinDef = "miter";
      this.fillColDef = "rgba(128,128,128,1.0)";  // gray
      this.fontSizeDef = 12;                      // pixels
      this.fontWeightDef = 400;                   // 100..900, 400 = normal, 700 = bold
      this.fontFamilyDef = "Consolas, Monaco, 'Andale Mono', monospace";
      this.clipCount = 0;                         // count ClipMask calls for use by resetClip

      this.setWorldCoordsSVG();                   // set default coordinate values (eqiv to raw pixels)
    }
  
    getUnique()
    {
      this.bkgCanvas.unique += 1; 
      return this.bkgCanvas.unique;
    }

    toPixelCoords(x, y)
    {
      // transform x,y in world coords to canvas pixel coords (top left is 0,0 y axis +ve down)
      const xPx = this.vpOrgX+this.xoffset+x*this.xscl,
            yPx = this.vpOrgY+this.yoffset+y*this.yscl;

      return {x: xPx, y: yPx};
    }

    toWorldCoords(xPx, yPx)
    {
      // transform xPx,yPx in raw canvas pixels to world coords (lower left is 0,0 +ve up)
      const xW = (xPx - this.vpOrgX - this.xoffset)/this.xscl,
            yW = (yPx - this.vpOrgY - this.yoffset)/this.yscl;

      return {x: xW, y: yW};
    }

    getCursorPosWC(evt)
    {
      // pass in any mouse event, returns the position of the cursor in raw pixel coords
      const rect = this.cnvs.getBoundingClientRect();

      return this.toWorldCoords(evt.clientX-rect.left, evt.clientY-rect.top);
    }

    clearCanvas(fillColor)
    {
      if (typeof(fillColor) == "string")
      {
        this.ctx.save();            // going to change fillStyle, save current
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(0, 0, this.rawWidth, this.rawHeight);
        this.ctx.restore();
      }
      else
      {
        this.ctx.clearRect(0, 0, this.rawWidth, this.rawHeight);
      }
      // all drawing erased, but graphics contexts remain intact
      // clear the dragObjects array, draggables put back when rendered
      const layerObj = getLayer(this);
      layerObj.dragObjects.length = 0;
    }

    gridboxPadding(left, bottom, right, top)
    {
      // left, bottom, right, top are the padding from the respective sides, 
      // all are in % of canvas width units, negative values are set to 0.
      const setDefault = ()=>{
        this.vpW = this.rawWidth;
        this.vpH = this.rawHeight;
        this.vpOrgX = 0;
        this.vpOrgY = 0;
        this.setWorldCoordsSVG(); // if new gridbox created, world coords are garbage, so reset to defaults
      }

      if (left === undefined)   // no error just reset to default
      {
        setDefault();
        return;
      }
      // check if only left defined
      if (bottom === undefined)  // only one parameter
      {
        if ((left >= 50) || (left < 0))
        {
          console.warn("Range Error: gridboxPadding right less than left");
          setDefault();
          return;
        }
        bottom = left;
      }
      if ((left < 0) || (left > 99))
      {
        left = 0;
      }
      // now we have a valid left and a bottom
      if ((bottom < 0) || (bottom > 99/this.aRatio))
      {
        bottom = 0;
      }
      if (right === undefined)   // right == 0 is OK
      {
        right = left;
      }
      else if (right < 0)
      {
        right = 0;
      }
      if (top === undefined)    // top == 0 is OK
      {
        top = bottom;
      }
      else if (top < 0)
      {
        top = 0;
      }
      // now we have all 4 valid padding values
      const width = 100 - left - right;
      const height = 100/this.aRatio - top - bottom;
      if ((width < 0) || (height < 0))
      {
        console.warn("Range Error: gridboxPadding invalid dimensions");
        setDefault();
        return;
      }

      this.vpW = width*this.rawWidth/100;
      this.vpH = height*this.rawWidth/100;
      // now calc upper left of gridbox in pixels = this is the vpOrg
      this.vpOrgX = left*this.rawWidth/100;
      this.vpOrgYsvg = top*this.rawWidth/100;  // SVG vpOrg is up at the top left
      this.vpOrgYrhc = this.vpOrgYsvg+this.vpH;// RHC vpOrg is down at the lower left
      this.vpOrgY = this.vpOrgYsvg;            // SVG is the default
      this.savGB.lft = left;
      this.savGB.bot = bottom;
      this.savGB.spanX = width;
      this.savGB.spanY = height;
      this.setWorldCoordsSVG(); // if new gridbox created, world coords are garbage, so reset to defaults
    }

    setWorldCoordsSVG(vpOrgXWC=0, vpOrgYWC=0, spanXWC=0, spanYWC=0)
    {
      // gridbox origin is upper left
      this.vpOrgXWC = vpOrgXWC;
      this.vpOrgYWC = vpOrgYWC;
      this.vpWWC = spanXWC;
      this.vpHWC = spanYWC;

      this.vpOrgY = this.vpOrgYsvg;       // switch vpOrg to upper left corner of gridbox
      if (spanXWC > 0)
      {
        this.xscl = this.vpW/spanXWC;
      }
      else
      {
        this.xscl = 1;                    // use pixel units
        this.vpWWC = this.vpW;
      }
      if (spanYWC > 0)
      {
        this.yscl = this.vpH/spanYWC;       // yscl is positive for SVG
      }
      else
      {
        this.yscl = this.xscl;            // square pixels
        this.vpHWC = this.vpH/this.xscl;
      }
      this.yDown = true;                  // flag true for SVG world coords being used
      this.isoYscl = this.xscl;
      this.xoffset = -vpOrgXWC*this.xscl;
      this.yoffset = -vpOrgYWC*this.yscl;   // reference to upper left of gridbox
      // save values to support resetting zoom and pan
      this.savWCscl.xscl = this.xscl;
      this.savWCscl.yscl = this.yscl;
      this.savWCscl.xoffset = this.xoffset;
      this.savWCscl.yoffset = this.yoffset;
    }

    dropShadow(obj)  // no argument will reset to no drop shadows 
    {
      let xOfs = 0,
          yOfs = 0,
          radius = 0,
          color = "#000000",
          yScale = 1;

      if (obj != undefined)
      {
        xOfs = obj.shadowOffsetX || 0;
        yOfs = obj.shadowOffsetY || 0;
        radius = obj.shadowBlur || 0;
        color = obj.shadowColor || "#000000";
        yScale = (obj.iso)? this.isoYscl: this.yscl;   // iso scaling
      }
      this.ctx.shadowOffsetX = xOfs*this.xscl;
      this.ctx.shadowOffsetY = yOfs*yScale;
      this.ctx.shadowBlur = radius*this.xscl;
      this.ctx.shadowColor = color;
    }

    genOfsTfmMatrix(obj)
    {
      const yWC_to_isoWC = Math.abs(this.yscl/this.xscl);
      let ofsMat = matrixIdent();

      ofsMat = matrixMult(obj.ofsTfmMat, ofsMat);   // ofsTfmMat will be identity unless transformRestore called

      obj.ofsTfmAry.slice().forEach((xfmr)=>{
          if (xfmr.type === "TRN")
        {
          // objects descriptors assume iso world coords 
          ofsMat = matrixTranslate(ofsMat, xfmr.args[0], xfmr.args[1]*yWC_to_isoWC); 
        }
        else if (xfmr.type === "ROT")
        {
          ofsMat = matrixRotate(ofsMat, -xfmr.args[0]);
        }
        else if (xfmr.type === "SCL")
        {
          obj.savScale *= Math.abs(xfmr.args[0]); // accumulate scaling to apply to lineWidth
          ofsMat = matrixScale(ofsMat, xfmr.args[0], xfmr.args[1]);
        }
        else if (xfmr.type === "SKW")
        {
          ofsMat = matrixSkew(ofsMat, -xfmr.args[0], xfmr.args[1]);
        } 
      });

      return ofsMat;
    }

    genNetTfmMatrix(obj, softTfm)
    {
      const yWC_to_isoWC = Math.abs(this.yscl/this.xscl);

      obj.netTfm = matrixIdent();  // clear out previous transforms

    // handle world coordinate scaling, assuming default is iso
    if (!obj.iso)
      { 
        // SVG coords descriptors assume iso scaling, Cango allows non-iso
        obj.netTfm = matrixScale(obj.netTfm, 1, yWC_to_isoWC); 
      }
      if (obj.type === "IMG" && !this.yDown)
      {
        // Img always upright and iso
        obj.netTfm = matrixScale(obj.netTfm, 1, -1);
      }
      else if (obj.type === "TEXT")
      {
        obj.netTfm = matrixScale(obj.netTfm, 1/this.xscl, 1/this.isoYscl);
      }
    
      obj.hardTfmAry.slice(0).forEach((xfmr)=>{
          if (xfmr.type === "TRN")
        {
          // objects descriptors assume iso world coords 
          obj.netTfm = matrixTranslate(obj.netTfm, xfmr.args[0], xfmr.args[1]*yWC_to_isoWC); 
        }
        else if (xfmr.type === "ROT")
        {
          obj.netTfm = matrixRotate(obj.netTfm, -xfmr.args[0]);
        }
        else if (xfmr.type === "SCL")
        {
          obj.savScale *= Math.abs(xfmr.args[0]); // accumulate scaling to apply to lineWidth
          obj.netTfm = matrixScale(obj.netTfm, xfmr.args[0], xfmr.args[1]);
        }
        else if (xfmr.type === "SKW")
        { 
          obj.netTfm = matrixSkew(obj.netTfm, -xfmr.args[0], xfmr.args[1]);    
        }
      });

      obj.netTfm = matrixMult(softTfm, obj.netTfm);

      // canvas ctx expects transforms in reverse order (matricies use preMultiply)
      obj.netTfm = matrixScale(obj.netTfm, this.xscl, this.isoYscl);
      obj.netTfm = matrixTranslate(obj.netTfm, this.vpOrgX + this.xoffset, this.vpOrgY + this.yoffset);
  
      }

    handleDnD(obj)
    {
      // update dragNdrop layer to match this canvas
      const currLr = getLayer(this);
      if (currLr !== obj.dragNdrop.layer)
      {
        if (obj.dragNdrop.layer)  // if not the first time rendered
        {
          // remove the object reference from the old layer
          const aidx = obj.dragNdrop.layer.dragObjects.indexOf(obj);
          if (aidx !== -1)
          {
            obj.dragNdrop.layer.dragObjects.splice(aidx, 1);
          }
        }
      }
      obj.dragNdrop.cgo = this;
      obj.dragNdrop.layer = currLr;
      // now push it into Cango.dragObjects array, its checked by canvas mousedown event handler
      if (!obj.dragNdrop.layer.dragObjects.includes(obj))
      {
        obj.dragNdrop.layer.dragObjects.push(obj);
      }
    }
  
   /*========================================================
    * render will draw a Group or Obj2D.
    * If an Obj2D is passed, update the netTfm and render it.
    * If a Group is passed, recursively update the netTfm of 
    * the group's family tree, then render all Obj2Ds.
    *-------------------------------------------------------*/
    render(rootObj, clear)
    {
      const yWC_to_isoWC = Math.abs(this.xscl/this.yscl);
      this.isoYscl = (this.yDown)? this.xscl: -this.xscl;  // update to the latest in case of zoom etc changing WC

      const handleTransforms = (obj)=>
      {
        const grpTfmMat = (obj.parent)? matrixClone(obj.parent.netTfmMat): matrixIdent();
        obj.savScale = (obj.parent)? obj.savScale: 1;  // reset the scale factor for re-calc
        // generate the currOfsTfmMat
        obj.ofsTfmMat = this.genOfsTfmMatrix(obj);
        // finished with ofsTfmAry reset it 
        obj.ofsTfmAry.length = 0;
        // save the matrix for transformRestore
        obj.currOfsTfmMat = matrixClone(obj.ofsTfmMat);
        let softTfmMat = matrixMult(grpTfmMat, obj.ofsTfmMat);

        // finished with ofsTfmMat so reset it
        obj.ofsTfmMat = matrixIdent();
        // apply the soft transforms to the dwgOrg of the Group or the Obj2D
        obj.dwgOrg = matrixTransformPoint(softTfmMat, {x:0, y:0});
        obj.dwgOrg.y *= yWC_to_isoWC;
      
        if (obj.type === "GRP")
        {
          obj.netTfmMat = softTfmMat;
        }
        else
        {
          this.genNetTfmMatrix(obj, softTfmMat);
        }
      }

      const recursiveGenNetTfmAry = (root)=>
      {
        const flatAry = [];

        const iterate = (obj)=>
        {
          if (obj.type === "GRP")    // find Obj2Ds to draw
          {
            if (typeof obj.preRender === "function")
            {
              obj.preRender(this);    // user defined object (extends Group) pre-render code
            }

            handleTransforms(obj);
            obj.children.forEach((childNode)=>{
              iterate(childNode);
            });
            flatAry.push(new ClipMask());   // clear mask at the end of each grp children render
          }
          else
          {
            handleTransforms(obj);
            flatAry.push(obj);       // just push into the array to be drawn
          }
        }
        // now propagate the current grpXfm through the tree of children
        iterate(root);

        return flatAry;
      }

  // ============ Start Here =====================================================

      if (!types.includes(rootObj.type))
      {
        console.warn("Type Error: render argument 1");
        return;
      }
      // recursively apply transforms returning the family tree flattened to an array of Obj2D
      const objAry = recursiveGenNetTfmAry(rootObj);
      const renderInSeries = async ()=>
      { 
        const jobList = [];
        for (let j=0; j<objAry.length; j++)
        {
          const obj = objAry[j];
          if (obj.type === "IMG")
          {
            await new Promise(resolve =>{
              const imgLoaded = ()=>{ 
                jobList.push(obj)
                resolve();
              }
              if (obj.imgBuf.complete || obj.imgBuf instanceof HTMLCanvasElement)    // see if already loaded
              {
                imgLoaded();
              }
              else
              {
                obj.imgBuf.addEventListener('load', imgLoaded);
              }
            });
          }
          else
          {
            jobList.push(obj);          
          } 
        }

        if (clear === true || clear === "clear")
        {
          this.clearCanvas();
        }
        for (let j=0; j<jobList.length; j++)
        {
          jobList[j].paint(this);
        }
      }
      // now render the array of Obj2Ds in series
      renderInSeries();
    }

    genLinGradPX(lgrad, obj)
    {
      const p1x = lgrad.grad.x1,
            p1y = lgrad.grad.y1,
            p2x = lgrad.grad.x2,
            p2y = lgrad.grad.y2;
      let tp1 = matrixTransformPoint(obj.netTfm, {x:p1x, y:p1y});
      let tp2 = matrixTransformPoint(obj.netTfm, {x:p2x, y:p2y});
      if (obj.type === "IMG" && !this.yDown)    // IMG is flipped vertically, don't flip the gradient
      {
        const m = matrixScale(obj.netTfm, 1, -1);  // flip vertically
        tp1 = matrixTransformPoint(obj.netTfm, {x:p1x, y:-p1y});
        tp2 = matrixTransformPoint(obj.netTfm, {x:p2x, y:-p2y});
      }

      const grad = this.ctx.createLinearGradient(tp1.x, tp1.y, tp2.x, tp2.y);
      lgrad.colorStops.forEach((colStop)=>{
        grad.addColorStop(colStop.stop, colStop.color);
      });

      return grad;
    }

    genRadGradPX(rgrad, obj)
    {
      const scl = obj.savScale*this.xscl;
      const p1x = rgrad.grad.x1,
            p1y = rgrad.grad.y1,
            r1 = rgrad.grad.r1*scl,
            p2x = rgrad.grad.x2,
            p2y = rgrad.grad.y2,
            r2 = rgrad.grad.r2*scl;
      let tp1 = matrixTransformPoint(obj.netTfm, {x:p1x, y:p1y});
      let tp2 = matrixTransformPoint(obj.netTfm, {x:p2x, y:p2y});
      if (obj.type === "IMG" && !this.yDown)    // IMG is flipped vertically, don't flip the gradient
      {
        const m = matrixScale(obj.netTfm, 1, -1);  // flip vertically
        tp1 = matrixTransformPoint(obj.netTfm, {x:p1x, y:-p1y});
        tp2 = matrixTransformPoint(obj.netTfm, {x:p2x, y:-p2y});
      }
      
      const grad = this.ctx.createRadialGradient(tp1.x, tp1.y, r1, tp2.x, tp2.y, r2);
      rgrad.colorStops.forEach((colStop)=>{
        grad.addColorStop(colStop.stop, colStop.color);
      });

      return grad;
    }

    resetClip()
    {
      // always called at end of render to ensure no stray clip masks
      while (this.clipCount > 0)
      {
        this.ctx.restore();   // restore raw pixel, default style saved at line 2818 
        this.clipCount--;
      }
    }

    genLinGradWC(lgrad)
    {
      const grad = this.ctx.createLinearGradient(lgrad.grad.x1, lgrad.grad.y1*this.isoYscl, 
                                                lgrad.grad.x2, lgrad.grad.y2*this.isoYscl);
      lgrad.colorStops.forEach((colStop)=>{
        grad.addColorStop(colStop.stop, colStop.color);
      });

      return grad;
    }

    genRadGradWC(rgrad)
    {
      const grad = this.ctx.createRadialGradient(rgrad.grad.x1, rgrad.grad.y1*this.isoYscl, rgrad.grad.r1, 
                                                rgrad.grad.x2, rgrad.grad.y2*this.isoYscl, rgrad.grad.r2);
      rgrad.colorStops.forEach((colStop)=>{
        grad.addColorStop(colStop.stop, colStop.color);
      });
      return grad;
    }

    drawPath(pathDef, options)
    {
      const pathObj = new Path(pathDef, options);

      this.render(pathObj);
    }

    drawShape(pathDef, options)
    {
      // outline the same as fill color
      const pathObj = new Shape(pathDef, options);

      this.render(pathObj);
    }
  };

}());
