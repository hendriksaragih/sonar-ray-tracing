/*=========================================================================
  Filename: hpKnob-29.js
  Javascript simulation of knob used in HP instruments.

  Open source, free to use
  Giving credit to A.R.Collins <http://www.arc.id.au> would be appreciated.

  Date     Description                                                 By
  -------|------------------------------------------------------------|----
  21Sep07 First release just knob motion                                ARC
  22Sep07 Full rotary pulse generation functionality                    ARC
  23Sep07 bugfix: use documentElement not body for scroll               ARC
  04Oct07 Added setTimeout to limit number of interrupts                ARC
  08Oct07 Remove timeout - didn't work in IE 6                          ARC
  30Oct07 Made interval timer work with IE                              ARC
  08Jul08 Stop Mozilla drag n drop of knob face                         ARC
  13Jul08 don't pass obj to event handler, 'this' is same               ARC
  14Jul08 use stopDefault from 'Pro JS techniques' p121                 ARC
  04Dec08 bugfix: divide by 0 in drag handler                           ARC
  06Jul10 bugfix: mouse position fixed for chrome browser               ARC
  13Nov10 move dent to cursor pos on click to avoid jump on first move  ARC
  12Dec10 tidy up closures remove unnecessary vars                      ARC
  24Apr12 scrap em's and resize code, work in pixels                    ARC
  25Apr12 major rewrite, using drag object                              ARC
  07Jul12 bugfix: getPosition now includes border offsets
  09Apr15 Use latest CSS selectors etc                                  ARC
  09Jun18 Make callBack a property that can be changed                  ARC
  22Jul20 Make Knob a Class                  
          Use Math.trunc not homebrew                                   ARC
 *=========================================================================*/

  class Knob
  {
    constructor(knobId, callBackFn)
    {
      const pulsesPerRev = 128;
      this.knobNode = document.getElementById(knobId);

      this.angle = Math.PI;     // start with dent over on the left
      this.residue = 0;
      this.radPerPulse = 2*Math.PI/pulsesPerRev;  // 128 pulses per revolution = 0.0491
      this.grabOfsAng = 0;     // offset of line to cursor from knob angle
      this.face = this.knobNode.children[0];
      this.dent = this.knobNode.children[1];
      this.radius = 0.65*this.dent.offsetWidth;    // radius of motion of dent
      // move the dent to the initial angle just assigned
      this.knobPaint();
      // now make the 'dent' draggable
      this.dent.onmousedown = (e)=>this.grab(e);
      this.callBack = callBackFn || null;
    } 

    getCsrPos(e){
      // pass in any mouse event, returns the position of the cursor in raw pixel coords
      const rect = this.face.getBoundingClientRect();

      return {x: e.clientX - rect.left, y: e.clientY - rect.top};
    }

    grab(e){
      const csrPos = this.getCsrPos(e),     // update mouse pos to pass to the owner
            csrX = csrPos.x - this.knobNode.offsetWidth/2,  // cursor coords relative to rotation centre
            csrY = csrPos.y - this.knobNode.offsetHeight/2;   // new rotation angle

      e.preventDefault();
      document.onmouseup = ()=>{
        document.onmouseup = null;
        document.onmousedown = null;
        document.onmousemove = null;
      };

      document.onmousemove = (e)=>this.drag(e);
      this.grabOfsAng = Math.atan2(-csrY, csrX) - this.angle;    // all angles in radians

      return false;
    }

    drag(e){
      const csrPos = this.getCsrPos(e),     // update mouse pos to pass to the owner
            csrX = csrPos.x - this.knobNode.offsetWidth/2,  // cursor coords relative to rotation centre
            csrY = csrPos.y - this.knobNode.offsetHeight/2,
            newA = Math.atan2(-csrY, csrX) - this.grabOfsAng;   // new rotation angle

      e.preventDefault();
      // calc change in angle
      if (newA - this.angle > 6)    // da will jump > when newA wraps around (jumps by 2PI)
      {
        // newA has wrapped around wrap 'angle' to match
        this.angle += 2*Math.PI;
      }
      if (newA - this.angle < -6)
      {
        this.angle -= 2*Math.PI;
      }
      const da = newA - this.angle + this.residue;     // change in rotation angle since last call
      const pulses = Math.trunc(da/this.radPerPulse);  // calc pulses proportional to angular movement
      this.residue = da - pulses*this.radPerPulse;     // re-calc the residue after a pulse movement
      this.angle = newA;                    // save the new requested angle
      // now move the dimple to reflect rotation if pulses generated
      if (pulses)
      {
        this.knobPaint();
        if (this.callBack)
        {
          this.callBack(-pulses);        // +ve clockwise
        }
      }
      return false;
    }

    knobPaint(){
      const dentX = this.radius*Math.cos(this.angle),   // center of dent relative to knob center
            dentY = -this.radius*Math.sin(this.angle);

      this.dent.style.left = (this.knobNode.offsetWidth/2 + dentX - this.dent.offsetWidth/2) + "px";
      this.dent.style.top = (this.knobNode.offsetHeight/2 + dentY - this.dent.offsetHeight/2) + "px";
    }
  }
