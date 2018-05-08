(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * http://animejs.com
 * JavaScript animation engine
 * @version v2.2.0
 * @author Julian Garnier
 * @copyright ©2017 Julian Garnier
 * Released under the MIT license
**/

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.anime = factory();
  }
}(this, () => {

  // Defaults

  const defaultInstanceSettings = {
    update: undefined,
    begin: undefined,
    run: undefined,
    complete: undefined,
    loop: 1,
    direction: 'normal',
    autoplay: true,
    offset: 0
  }

  const defaultTweenSettings = {
    duration: 1000,
    delay: 0,
    easing: 'easeOutElastic',
    elasticity: 500,
    round: 0
  }

  const validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skewX', 'skewY', 'perspective'];
  let transformString;

  // Utils

  function stringContains(str, text) {
    return str.indexOf(text) > -1;
  }

  const is = {
    arr: a => Array.isArray(a),
    obj: a => stringContains(Object.prototype.toString.call(a), 'Object'),
    pth: a => is.obj(a) && a.hasOwnProperty('totalLength'),
    svg: a => a instanceof SVGElement,
    dom: a => a.nodeType || is.svg(a),
    str: a => typeof a === 'string',
    fnc: a => typeof a === 'function',
    und: a => typeof a === 'undefined',
    hex: a => /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a),
    rgb: a => /^rgb/.test(a),
    hsl: a => /^hsl/.test(a),
    col: a => (is.hex(a) || is.rgb(a) || is.hsl(a))
  }

  // BezierEasing https://github.com/gre/bezier-easing

  const bezier = (() => {

    const kSplineTableSize = 11;
    const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 };
    function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 };
    function C (aA1)      { return 3.0 * aA1 };

    function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT };
    function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) };

    function binarySubdivide (aX, aA, aB, mX1, mX2) {
      let currentX, currentT, i = 0;
      do {
        currentT = aA + (aB - aA) / 2.0;
        currentX = calcBezier(currentT, mX1, mX2) - aX;
        if (currentX > 0.0) { aB = currentT } else { aA = currentT };
      } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
      return currentT;
    }

    function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
      for (let i = 0; i < 4; ++i) {
        const currentSlope = getSlope(aGuessT, mX1, mX2);
        if (currentSlope === 0.0) return aGuessT;
        const currentX = calcBezier(aGuessT, mX1, mX2) - aX;
        aGuessT -= currentX / currentSlope;
      }
      return aGuessT;
    }

    function bezier(mX1, mY1, mX2, mY2) {

      if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) return;
      let sampleValues = new Float32Array(kSplineTableSize);

      if (mX1 !== mY1 || mX2 !== mY2) {
        for (let i = 0; i < kSplineTableSize; ++i) {
          sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
        }
      }

      function getTForX(aX) {

        let intervalStart = 0.0;
        let currentSample = 1;
        const lastSample = kSplineTableSize - 1;

        for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
          intervalStart += kSampleStepSize;
        }

        --currentSample;

        const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
        const guessForT = intervalStart + dist * kSampleStepSize;
        const initialSlope = getSlope(guessForT, mX1, mX2);

        if (initialSlope >= 0.001) {
          return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
        } else if (initialSlope === 0.0) {
          return guessForT;
        } else {
          return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
        }

      }

      return x => {
        if (mX1 === mY1 && mX2 === mY2) return x;
        if (x === 0) return 0;
        if (x === 1) return 1;
        return calcBezier(getTForX(x), mY1, mY2);
      }

    }

    return bezier;

  })();

  const easings = (() => {

    const names = ['Quad', 'Cubic', 'Quart', 'Quint', 'Sine', 'Expo', 'Circ', 'Back', 'Elastic'];

    // Elastic easing adapted from jQueryUI http://api.jqueryui.com/easings/

    function elastic(t, p) {
      return t === 0 || t === 1 ? t :
      -Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2.0) * Math.asin(1))) * (Math.PI * 2)) / p );
    }

    // Approximated Penner equations http://matthewlein.com/ceaser/

    const equations = {
      In: [
        [0.550, 0.085, 0.680, 0.530], /* InQuad */
        [0.550, 0.055, 0.675, 0.190], /* InCubic */
        [0.895, 0.030, 0.685, 0.220], /* InQuart */
        [0.755, 0.050, 0.855, 0.060], /* InQuint */
        [0.470, 0.000, 0.745, 0.715], /* InSine */
        [0.950, 0.050, 0.795, 0.035], /* InExpo */
        [0.600, 0.040, 0.980, 0.335], /* InCirc */
        [0.600, -0.280, 0.735, 0.045], /* InBack */
        elastic /* InElastic */
      ], Out: [
        [0.250, 0.460, 0.450, 0.940], /* OutQuad */
        [0.215, 0.610, 0.355, 1.000], /* OutCubic */
        [0.165, 0.840, 0.440, 1.000], /* OutQuart */
        [0.230, 1.000, 0.320, 1.000], /* OutQuint */
        [0.390, 0.575, 0.565, 1.000], /* OutSine */
        [0.190, 1.000, 0.220, 1.000], /* OutExpo */
        [0.075, 0.820, 0.165, 1.000], /* OutCirc */
        [0.175, 0.885, 0.320, 1.275], /* OutBack */
        (t, f) => 1 - elastic(1 - t, f) /* OutElastic */
      ], InOut: [
        [0.455, 0.030, 0.515, 0.955], /* InOutQuad */
        [0.645, 0.045, 0.355, 1.000], /* InOutCubic */
        [0.770, 0.000, 0.175, 1.000], /* InOutQuart */
        [0.860, 0.000, 0.070, 1.000], /* InOutQuint */
        [0.445, 0.050, 0.550, 0.950], /* InOutSine */
        [1.000, 0.000, 0.000, 1.000], /* InOutExpo */
        [0.785, 0.135, 0.150, 0.860], /* InOutCirc */
        [0.680, -0.550, 0.265, 1.550], /* InOutBack */
        (t, f) => t < .5 ? elastic(t * 2, f) / 2 : 1 - elastic(t * -2 + 2, f) / 2 /* InOutElastic */
      ]
    }

    let functions = {
      linear: bezier(0.250, 0.250, 0.750, 0.750)
    }

    for (let type in equations) {
      equations[type].forEach((f, i) => {
        functions['ease'+type+names[i]] = is.fnc(f) ? f : bezier.apply(this, f);
      });
    }

    return functions;

  })();

  // Strings

  function stringToHyphens(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  function selectString(str) {
    if (is.col(str)) return;
    try {
      let nodes = document.querySelectorAll(str);
      return nodes;
    } catch(e) {
      return;
    }
  }

  // Arrays

  function filterArray(arr, callback) {
    const len = arr.length;
    const thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    let result = [];
    for (let i = 0; i < len; i++) {
      if (i in arr) {
        const val = arr[i];
        if (callback.call(thisArg, val, i, arr)) {
          result.push(val);
        }
      }
    }
    return result;
  }

  function flattenArray(arr) {
    return arr.reduce((a, b) => a.concat(is.arr(b) ? flattenArray(b) : b), []);
  }

  function toArray(o) {
    if (is.arr(o)) return o;
    if (is.str(o)) o = selectString(o) || o;
    if (o instanceof NodeList || o instanceof HTMLCollection) return [].slice.call(o);
    return [o];
  }

  function arrayContains(arr, val) {
    return arr.some(a => a === val);
  }

  // Objects

  function cloneObject(o) {
    let clone = {};
    for (let p in o) clone[p] = o[p];
    return clone;
  }

  function replaceObjectProps(o1, o2) {
    let o = cloneObject(o1);
    for (let p in o1) o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p];
    return o;
  }

  function mergeObjects(o1, o2) {
    let o = cloneObject(o1);
    for (let p in o2) o[p] = is.und(o1[p]) ? o2[p] : o1[p];
    return o;
  }

  // Colors

  function rgbToRgba(rgbValue) {
    const rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
    return rgb ? `rgba(${rgb[1]},1)` : rgbValue;
  }

  function hexToRgba(hexValue) {
    const rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const hex = hexValue.replace(rgx, (m, r, g, b) => r + r + g + g + b + b );
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const r = parseInt(rgb[1], 16);
    const g = parseInt(rgb[2], 16);
    const b = parseInt(rgb[3], 16);
    return `rgba(${r},${g},${b},1)`;
  }

  function hslToRgba(hslValue) {
    const hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
    const h = parseInt(hsl[1]) / 360;
    const s = parseInt(hsl[2]) / 100;
    const l = parseInt(hsl[3]) / 100;
    const a = hsl[4] || 1;
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    let r, g, b;
    if (s == 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return `rgba(${r * 255},${g * 255},${b * 255},${a})`;
  }

  function colorToRgb(val) {
    if (is.rgb(val)) return rgbToRgba(val);
    if (is.hex(val)) return hexToRgba(val);
    if (is.hsl(val)) return hslToRgba(val);
  }

  // Units

  function getUnit(val) {
    const split = /([\+\-]?[0-9#\.]+)(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
    if (split) return split[2];
  }

  function getTransformUnit(propName) {
    if (stringContains(propName, 'translate') || propName === 'perspective') return 'px';
    if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) return 'deg';
  }

  // Values

  function minMaxValue(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function getFunctionValue(val, animatable) {
    if (!is.fnc(val)) return val;
    return val(animatable.target, animatable.id, animatable.total);
  }

  function getCSSValue(el, prop) {
    if (prop in el.style) {
      return getComputedStyle(el).getPropertyValue(stringToHyphens(prop)) || '0';
    }
  }

  function getAnimationType(el, prop) {
    if (is.dom(el) && arrayContains(validTransforms, prop)) return 'transform';
    if (is.dom(el) && (el.getAttribute(prop) || (is.svg(el) && el[prop]))) return 'attribute';
    if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) return 'css';
    if (el[prop] != null) return 'object';
  }

  function getTransformValue(el, propName) {
    const defaultUnit = getTransformUnit(propName);
    const defaultVal = stringContains(propName, 'scale') ? 1 : 0 + defaultUnit;
    const str = el.style.transform;
    if (!str) return defaultVal;
    let match = [];
    let props = [];
    let values = [];
    const rgx = /(\w+)\((.+?)\)/g;
    while (match = rgx.exec(str)) {
      props.push(match[1]);
      values.push(match[2]);
    }
    const value = filterArray(values, (val, i) => props[i] === propName);
    return value.length ? value[0] : defaultVal;
  }

  function getOriginalTargetValue(target, propName) {
    switch (getAnimationType(target, propName)) {
      case 'transform': return getTransformValue(target, propName);
      case 'css': return getCSSValue(target, propName);
      case 'attribute': return target.getAttribute(propName);
    }
    return target[propName] || 0;
  }

  function getRelativeValue(to, from) {
    const operator = /^(\*=|\+=|-=)/.exec(to);
    if (!operator) return to;
    const u = getUnit(to) || 0;
    const x = parseFloat(from);
    const y = parseFloat(to.replace(operator[0], ''));
    switch (operator[0][0]) {
      case '+': return x + y + u;
      case '-': return x - y + u;
      case '*': return x * y + u;
    }
  }

  function validateValue(val, unit) {
    if (is.col(val)) return colorToRgb(val);
    const originalUnit = getUnit(val);
    const unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
    return unit && !/\s/g.test(val) ? unitLess + unit : unitLess;
  }

  // getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes. 
  // adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

  function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)); 
  }

  function getCircleLength(el) {
    return 2 * Math.PI * el.getAttribute('r');
  }

  function getRectLength(el) {
    return (el.getAttribute('width') * 2) + (el.getAttribute('height') * 2);
  }

  function getLineLength(el) {
    return getDistance(
      {x: el.getAttribute('x1'), y: el.getAttribute('y1')}, 
      {x: el.getAttribute('x2'), y: el.getAttribute('y2')}
    );
  }

  function getPolylineLength(el) {
    const points = el.points;
    let totalLength = 0;
    let previousPos;
    for (let i = 0 ; i < points.numberOfItems; i++) {
      const currentPos = points.getItem(i);
      if (i > 0) totalLength += getDistance(previousPos, currentPos);
      previousPos = currentPos;
    }
    return totalLength;
  }

  function getPolygonLength(el) {
    const points = el.points;
    return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
  }

  // Path animation

  function getTotalLength(el) {
    if (el.getTotalLength) return el.getTotalLength();
    switch(el.tagName.toLowerCase()) {
      case 'circle': return getCircleLength(el);
      case 'rect': return getRectLength(el);
      case 'line': return getLineLength(el);
      case 'polyline': return getPolylineLength(el);
      case 'polygon': return getPolygonLength(el);
    }
  }

  function setDashoffset(el) {
    const pathLength = getTotalLength(el);
    el.setAttribute('stroke-dasharray', pathLength);
    return pathLength;
  }

  // Motion path

  function getPath(path, percent) {
    const el = is.str(path) ? selectString(path)[0] : path;
    const p = percent || 100;
    return function(prop) {
      return {
        el: el,
        property: prop,
        totalLength: getTotalLength(el) * (p / 100)
      }
    }
  }

  function getPathProgress(path, progress) {
    function point(offset = 0) {
      const l = progress + offset >= 1 ? progress + offset : 0;
      return path.el.getPointAtLength(l);
    }
    const p = point();
    const p0 = point(-1);
    const p1 = point(+1);
    switch (path.property) {
      case 'x': return p.x;
      case 'y': return p.y;
      case 'angle': return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
    }
  }

  // Decompose value

  function decomposeValue(val, unit) {
    const rgx = /-?\d*\.?\d+/g;
    const value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
    return {
      original: value,
      numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
      strings: (is.str(val) || unit) ? value.split(rgx) : []
    }
  }

  // Animatables

  function parseTargets(targets) {
    const targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
    return filterArray(targetsArray, (item, pos, self) => self.indexOf(item) === pos);
  }

  function getAnimatables(targets) {
    const parsed = parseTargets(targets);
    return parsed.map((t, i) => {
      return {target: t, id: i, total: parsed.length};
    });
  }

  // Properties

  function normalizePropertyTweens(prop, tweenSettings) {
    let settings = cloneObject(tweenSettings);
    if (is.arr(prop)) {
      const l = prop.length;
      const isFromTo = (l === 2 && !is.obj(prop[0]));
      if (!isFromTo) {
        // Duration divided by the number of tweens
        if (!is.fnc(tweenSettings.duration)) settings.duration = tweenSettings.duration / l;
      } else {
        // Transform [from, to] values shorthand to a valid tween value
        prop = {value: prop};
      }
    }
    return toArray(prop).map((v, i) => {
      // Default delay value should be applied only on the first tween
      const delay = !i ? tweenSettings.delay : 0;
      // Use path object as a tween value
      let obj = is.obj(v) && !is.pth(v) ? v : {value: v};
      // Set default delay value
      if (is.und(obj.delay)) obj.delay = delay;
      return obj;
    }).map(k => mergeObjects(k, settings));
  }

  function getProperties(instanceSettings, tweenSettings, params) {
    let properties = [];
    const settings = mergeObjects(instanceSettings, tweenSettings);
    for (let p in params) {
      if (!settings.hasOwnProperty(p) && p !== 'targets') {
        properties.push({
          name: p,
          offset: settings['offset'],
          tweens: normalizePropertyTweens(params[p], tweenSettings)
        });
      }
    }
    return properties;
  }

  // Tweens

  function normalizeTweenValues(tween, animatable) {
    let t = {};
    for (let p in tween) {
      let value = getFunctionValue(tween[p], animatable);
      if (is.arr(value)) {
        value = value.map(v => getFunctionValue(v, animatable));
        if (value.length === 1) value = value[0];
      }
      t[p] = value;
    }
    t.duration = parseFloat(t.duration);
    t.delay = parseFloat(t.delay);
    return t;
  }

  function normalizeEasing(val) {
    return is.arr(val) ? bezier.apply(this, val) : easings[val];
  }

  function normalizeTweens(prop, animatable) {
    let previousTween;
    return prop.tweens.map(t => {
      let tween = normalizeTweenValues(t, animatable);
      const tweenValue = tween.value;
      const originalValue = getOriginalTargetValue(animatable.target, prop.name);
      const previousValue = previousTween ? previousTween.to.original : originalValue;
      const from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
      const to = getRelativeValue(is.arr(tweenValue) ? tweenValue[1] : tweenValue, from);
      const unit = getUnit(to) || getUnit(from) || getUnit(originalValue);
      tween.from = decomposeValue(from, unit);
      tween.to = decomposeValue(to, unit);
      tween.start = previousTween ? previousTween.end : prop.offset;
      tween.end = tween.start + tween.delay + tween.duration;
      tween.easing = normalizeEasing(tween.easing);
      tween.elasticity = (1000 - minMaxValue(tween.elasticity, 1, 999)) / 1000;
      tween.isPath = is.pth(tweenValue);
      tween.isColor = is.col(tween.from.original);
      if (tween.isColor) tween.round = 1;
      previousTween = tween;
      return tween;
    });
  }

  // Tween progress

  const setTweenProgress = {
    css: (t, p, v) => t.style[p] = v,
    attribute: (t, p, v) => t.setAttribute(p, v),
    object: (t, p, v) => t[p] = v,
    transform: (t, p, v, transforms, id) => {
      if (!transforms[id]) transforms[id] = [];
      transforms[id].push(`${p}(${v})`);
    }
  }

  // Animations

  function createAnimation(animatable, prop) {
    const animType = getAnimationType(animatable.target, prop.name);
    if (animType) {
      const tweens = normalizeTweens(prop, animatable);
      return {
        type: animType,
        property: prop.name,
        animatable: animatable,
        tweens: tweens,
        duration: tweens[tweens.length - 1].end,
        delay: tweens[0].delay
      }
    }
  }

  function getAnimations(animatables, properties) {
    return filterArray(flattenArray(animatables.map(animatable => {
      return properties.map(prop => {
        return createAnimation(animatable, prop);
      });
    })), a => !is.und(a));
  }

  // Create Instance

  function getInstanceTimings(type, animations, instanceSettings, tweenSettings) {
    const isDelay = (type === 'delay');
    if (animations.length) {
      return (isDelay ? Math.min : Math.max).apply(Math, animations.map(anim => anim[type]));
    } else {
      return isDelay ? tweenSettings.delay : instanceSettings.offset + tweenSettings.delay + tweenSettings.duration;
    }
  }

  function createNewInstance(params) {
    const instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
    const tweenSettings = replaceObjectProps(defaultTweenSettings, params);
    const animatables = getAnimatables(params.targets);
    const properties = getProperties(instanceSettings, tweenSettings, params);
    const animations = getAnimations(animatables, properties);
    return mergeObjects(instanceSettings, {
      children: [],
      animatables: animatables,
      animations: animations,
      duration: getInstanceTimings('duration', animations, instanceSettings, tweenSettings),
      delay: getInstanceTimings('delay', animations, instanceSettings, tweenSettings)
    });
  }

  // Core

  let activeInstances = [];
  let raf = 0;

  const engine = (() => {
    function play() { raf = requestAnimationFrame(step); };
    function step(t) {
      const activeLength = activeInstances.length;
      if (activeLength) {
        let i = 0;
        while (i < activeLength) {
          if (activeInstances[i]) activeInstances[i].tick(t);
          i++;
        }
        play();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    return play;
  })();


  // Public Instance

  function anime(params = {}) {

    let now, startTime, lastTime = 0;

    let resolve = null;

    function makePromise() {
      return window.Promise && new Promise(_resolve => resolve = _resolve);
    }

    let promise = makePromise();

    let instance = createNewInstance(params);

    function toggleInstanceDirection() {
      instance.reversed = !instance.reversed;
    }

    function adjustTime(time) {
      return instance.reversed ? instance.duration - time : time;
    }

    function syncInstanceChildren(time) {
      const children = instance.children;
      const childrenLength = children.length;
      if (time >= instance.currentTime) {
        for (let i = 0; i < childrenLength; i++) children[i].seek(time);
      } else {
        for (let i = childrenLength; i--;) children[i].seek(time);
      }
    }

    function setAnimationsProgress(insTime) {
      let i = 0;
      let transforms = {};
      const animations = instance.animations;
      const animationsLength = animations.length;
      while (i < animationsLength) {
        const anim = animations[i];
        const animatable = anim.animatable;
        const tweens = anim.tweens;
        const tweenLength = tweens.length - 1;
        let tween = tweens[tweenLength];
        // Only check for keyframes if there is more than one tween
        if (tweenLength) tween = filterArray(tweens, t => (insTime < t.end))[0] || tween;
        const elapsed = minMaxValue(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration;
        const eased = isNaN(elapsed) ? 1 : tween.easing(elapsed, tween.elasticity);
        const strings = tween.to.strings;
        const round = tween.round;
        let numbers = [];
        let progress;
        const toNumbersLength = tween.to.numbers.length;
        for (let n = 0; n < toNumbersLength; n++) {
          let value;
          const toNumber = tween.to.numbers[n];
          const fromNumber = tween.from.numbers[n];
          if (!tween.isPath) {
            value = fromNumber + (eased * (toNumber - fromNumber));
          } else {
            value = getPathProgress(tween.value, eased * toNumber);
          }
          if (round) {
            if (!(tween.isColor && n > 2)) {
              value = Math.round(value * round) / round;
            }
          }
          numbers.push(value);
        }
        // Manual Array.reduce for better performances
        const stringsLength = strings.length;
        if (!stringsLength) {
          progress = numbers[0];
        } else {
          progress = strings[0];
          for (let s = 0; s < stringsLength; s++) {
            const a = strings[s];
            const b = strings[s + 1];
            const n = numbers[s];
            if (!isNaN(n)) {
              if (!b) {
                progress += n + ' ';
              } else {
                progress += n + b;
              }
            }
          }
        }
        setTweenProgress[anim.type](animatable.target, anim.property, progress, transforms, animatable.id);
        anim.currentValue = progress;
        i++;
      }
      const transformsLength = Object.keys(transforms).length;
      if (transformsLength) {
        for (let id = 0; id < transformsLength; id++) {
          if (!transformString) {
            const t = 'transform';
            transformString = (getCSSValue(document.body, t) ? t : `-webkit-${t}`);
          }
          instance.animatables[id].target.style[transformString] = transforms[id].join(' ');
        }
      }
      instance.currentTime = insTime;
      instance.progress = (insTime / instance.duration) * 100;
    }

    function setCallback(cb) {
      if (instance[cb]) instance[cb](instance);
    }

    function countIteration() {
      if (instance.remaining && instance.remaining !== true) {
        instance.remaining--;
      }
    }

    function setInstanceProgress(engineTime) {
      const insDuration = instance.duration;
      const insOffset = instance.offset;
      const insStart = insOffset + instance.delay;
      const insCurrentTime = instance.currentTime;
      const insReversed = instance.reversed;
      const insTime = adjustTime(engineTime);
      if (instance.children.length) syncInstanceChildren(insTime);
      if (insTime >= insStart || !insDuration) {
        if (!instance.began) {
          instance.began = true;
          setCallback('begin');
        }
        setCallback('run');
      }
      if (insTime > insOffset && insTime < insDuration) {
        setAnimationsProgress(insTime);
      } else {
        if (insTime <= insOffset && insCurrentTime !== 0) {
          setAnimationsProgress(0);
          if (insReversed) countIteration();
        }
        if ((insTime >= insDuration && insCurrentTime !== insDuration) || !insDuration) {
          setAnimationsProgress(insDuration);
          if (!insReversed) countIteration();
        }
      }
      setCallback('update');
      if (engineTime >= insDuration) {
        if (instance.remaining) {
          startTime = now;
          if (instance.direction === 'alternate') toggleInstanceDirection();
        } else {
          instance.pause();
          if (!instance.completed) {
            instance.completed = true;
            setCallback('complete');
            if ('Promise' in window) {
              resolve();
              promise = makePromise();
            }
          }
        }
        lastTime = 0;
      }
    }

    instance.reset = function() {
      const direction = instance.direction;
      const loops = instance.loop;
      instance.currentTime = 0;
      instance.progress = 0;
      instance.paused = true;
      instance.began = false;
      instance.completed = false;
      instance.reversed = direction === 'reverse';
      instance.remaining = direction === 'alternate' && loops === 1 ? 2 : loops;
      setAnimationsProgress(0);
      for (let i = instance.children.length; i--; ){
        instance.children[i].reset();
      }
    }

    instance.tick = function(t) {
      now = t;
      if (!startTime) startTime = now;
      const engineTime = (lastTime + now - startTime) * anime.speed;
      setInstanceProgress(engineTime);
    }

    instance.seek = function(time) {
      setInstanceProgress(adjustTime(time));
    }

    instance.pause = function() {
      const i = activeInstances.indexOf(instance);
      if (i > -1) activeInstances.splice(i, 1);
      instance.paused = true;
    }

    instance.play = function() {
      if (!instance.paused) return;
      instance.paused = false;
      startTime = 0;
      lastTime = adjustTime(instance.currentTime);
      activeInstances.push(instance);
      if (!raf) engine();
    }

    instance.reverse = function() {
      toggleInstanceDirection();
      startTime = 0;
      lastTime = adjustTime(instance.currentTime);
    }

    instance.restart = function() {
      instance.pause();
      instance.reset();
      instance.play();
    }

    instance.finished = promise;

    instance.reset();

    if (instance.autoplay) instance.play();

    return instance;

  }

  // Remove targets from animation

  function removeTargets(targets) {
    const targetsArray = parseTargets(targets);
    for (let i = activeInstances.length; i--;) {
      const instance = activeInstances[i];
      const animations = instance.animations;
      for (let a = animations.length; a--;) {
        if (arrayContains(targetsArray, animations[a].animatable.target)) {
          animations.splice(a, 1);
          if (!animations.length) instance.pause();
        }
      }
    }
  }

  // Timeline

  function timeline(params) {
    let tl = anime(params);
    tl.pause();
    tl.duration = 0;
    tl.add = function(instancesParams) {
      tl.children.forEach(i => { i.began = true; i.completed = true; });
      toArray(instancesParams).forEach(instanceParams => {
        let insParams = mergeObjects(instanceParams, replaceObjectProps(defaultTweenSettings, params || {}));
        insParams.targets = insParams.targets || params.targets;
        const tlDuration = tl.duration;
        const insOffset = insParams.offset;
        insParams.autoplay = false;
        insParams.direction = tl.direction;
        insParams.offset = is.und(insOffset) ? tlDuration : getRelativeValue(insOffset, tlDuration);
        tl.began = true;
        tl.completed = true;
        tl.seek(insParams.offset);
        const ins = anime(insParams);
        ins.began = true;
        ins.completed = true;
        if (ins.duration > tlDuration) tl.duration = ins.duration;
        tl.children.push(ins);
      });
      tl.seek(0);
      tl.reset();
      if (tl.autoplay) tl.restart();
      return tl;
    }
    return tl;
  }

  anime.version = '2.2.0';
  anime.speed = 1;
  anime.running = activeInstances;
  anime.remove = removeTargets;
  anime.getValue = getOriginalTargetValue;
  anime.path = getPath;
  anime.setDashoffset = setDashoffset;
  anime.bezier = bezier;
  anime.easings = easings;
  anime.timeline = timeline;
  anime.random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  return anime;

}));

}).call(this,require("gzNCgL"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/contrib\\anime.js","/contrib")
},{"buffer":5,"gzNCgL":4}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
(function ($) {
  var anim = require('./contrib/anime.js');
  var siteHeader = $('.site-header');

  var removeAnimElem = function () {
    anim.remove(siteHeader.find('img')[0]);
    anim.remove(siteHeader[0]);
  };
  var headerAnimeScroll = function (scroll) {
    var duration = 500;
    if (scroll > 20) {

      siteHeader.find('a').addClass('color-blue');
      siteHeader.find('a').removeClass('color-white');
      removeAnimElem();
      anim({
        targets: siteHeader.find('.site-header-main')[0],
        height: '60px',
        duration: duration,
        easing: 'easeInQuad',
      });
      anim({
        targets: siteHeader[0],
        backgroundColor: ["hsla(0, 0%, 100%,1)", "hsla(0, 0%, 100%,1)"],
        duration: duration,

      });
    } else {
      siteHeader.find('a').addClass('color-white');
      siteHeader.find('a').removeClass('color-blue');
      removeAnimElem();
      anim({
        targets: siteHeader.find('.site-header-main')[0],
        height: '80px',
        duration: duration,
        easing: 'easeInQuad'
      });
      anim({
        targets: siteHeader[0],
        backgroundColor: ["hsla(0, 0%, 100%,0)", "hsla(0, 0%, 100%,0)"],
        duration: duration,
        easing: 'easeInQuad'
      });
    }
  };

  function initHeaderScroll() {
    $(window).unbind("scroll.event");
    if ($(window).innerWidth() > 767) {
      siteHeader.css('background','unset');
      $(window).on('scroll.event', function (event) {
        console.log('launch');
        var scroll = $(window).scrollTop();
        headerAnimeScroll(scroll);
      })
    }else{
      siteHeader.css('background','white');
    }
  }

  initHeaderScroll();
  $(window).on('resize', function () {
    initHeaderScroll();
  })
})(jQuery);
}).call(this,require("gzNCgL"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_4e96f9d6.js","/")
},{"./contrib/anime.js":1,"buffer":5,"gzNCgL":4}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("gzNCgL"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\base64-js\\lib\\b64.js","/..\\..\\node_modules\\base64-js\\lib")
},{"buffer":5,"gzNCgL":4}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("gzNCgL"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\browserify\\node_modules\\process\\browser.js","/..\\..\\node_modules\\browserify\\node_modules\\process")
},{"buffer":5,"gzNCgL":4}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("gzNCgL"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\buffer\\index.js","/..\\..\\node_modules\\buffer")
},{"base64-js":3,"buffer":5,"gzNCgL":4,"ieee754":6}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("gzNCgL"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\ieee754\\index.js","/..\\..\\node_modules\\ieee754")
},{"buffer":5,"gzNCgL":4}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFx3YW1wNjRcXHd3d1xcZmlnbWFcXHdwLWNvbnRlbnRcXHRoZW1lc1xcYWRlbGlvbS10ZXN0XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJDOi93YW1wNjQvd3d3L2ZpZ21hL3dwLWNvbnRlbnQvdGhlbWVzL2FkZWxpb20tdGVzdC9hc3NldHMvanMvY29udHJpYi9hbmltZS5qcyIsIkM6L3dhbXA2NC93d3cvZmlnbWEvd3AtY29udGVudC90aGVtZXMvYWRlbGlvbS10ZXN0L2Fzc2V0cy9qcy9mYWtlXzRlOTZmOWQ2LmpzIiwiQzovd2FtcDY0L3d3dy9maWdtYS93cC1jb250ZW50L3RoZW1lcy9hZGVsaW9tLXRlc3Qvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiQzovd2FtcDY0L3d3dy9maWdtYS93cC1jb250ZW50L3RoZW1lcy9hZGVsaW9tLXRlc3Qvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkM6L3dhbXA2NC93d3cvZmlnbWEvd3AtY29udGVudC90aGVtZXMvYWRlbGlvbS10ZXN0L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJDOi93YW1wNjQvd3d3L2ZpZ21hL3dwLWNvbnRlbnQvdGhlbWVzL2FkZWxpb20tdGVzdC9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuK0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICogaHR0cDovL2FuaW1lanMuY29tXG4gKiBKYXZhU2NyaXB0IGFuaW1hdGlvbiBlbmdpbmVcbiAqIEB2ZXJzaW9uIHYyLjIuMFxuICogQGF1dGhvciBKdWxpYW4gR2FybmllclxuICogQGNvcHlyaWdodCDCqTIwMTcgSnVsaWFuIEdhcm5pZXJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuKiovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgIC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuICAgIC8vIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIHJvb3QuYW5pbWUgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgKCkgPT4ge1xuXG4gIC8vIERlZmF1bHRzXG5cbiAgY29uc3QgZGVmYXVsdEluc3RhbmNlU2V0dGluZ3MgPSB7XG4gICAgdXBkYXRlOiB1bmRlZmluZWQsXG4gICAgYmVnaW46IHVuZGVmaW5lZCxcbiAgICBydW46IHVuZGVmaW5lZCxcbiAgICBjb21wbGV0ZTogdW5kZWZpbmVkLFxuICAgIGxvb3A6IDEsXG4gICAgZGlyZWN0aW9uOiAnbm9ybWFsJyxcbiAgICBhdXRvcGxheTogdHJ1ZSxcbiAgICBvZmZzZXQ6IDBcbiAgfVxuXG4gIGNvbnN0IGRlZmF1bHRUd2VlblNldHRpbmdzID0ge1xuICAgIGR1cmF0aW9uOiAxMDAwLFxuICAgIGRlbGF5OiAwLFxuICAgIGVhc2luZzogJ2Vhc2VPdXRFbGFzdGljJyxcbiAgICBlbGFzdGljaXR5OiA1MDAsXG4gICAgcm91bmQ6IDBcbiAgfVxuXG4gIGNvbnN0IHZhbGlkVHJhbnNmb3JtcyA9IFsndHJhbnNsYXRlWCcsICd0cmFuc2xhdGVZJywgJ3RyYW5zbGF0ZVonLCAncm90YXRlJywgJ3JvdGF0ZVgnLCAncm90YXRlWScsICdyb3RhdGVaJywgJ3NjYWxlJywgJ3NjYWxlWCcsICdzY2FsZVknLCAnc2NhbGVaJywgJ3NrZXdYJywgJ3NrZXdZJywgJ3BlcnNwZWN0aXZlJ107XG4gIGxldCB0cmFuc2Zvcm1TdHJpbmc7XG5cbiAgLy8gVXRpbHNcblxuICBmdW5jdGlvbiBzdHJpbmdDb250YWlucyhzdHIsIHRleHQpIHtcbiAgICByZXR1cm4gc3RyLmluZGV4T2YodGV4dCkgPiAtMTtcbiAgfVxuXG4gIGNvbnN0IGlzID0ge1xuICAgIGFycjogYSA9PiBBcnJheS5pc0FycmF5KGEpLFxuICAgIG9iajogYSA9PiBzdHJpbmdDb250YWlucyhPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSksICdPYmplY3QnKSxcbiAgICBwdGg6IGEgPT4gaXMub2JqKGEpICYmIGEuaGFzT3duUHJvcGVydHkoJ3RvdGFsTGVuZ3RoJyksXG4gICAgc3ZnOiBhID0+IGEgaW5zdGFuY2VvZiBTVkdFbGVtZW50LFxuICAgIGRvbTogYSA9PiBhLm5vZGVUeXBlIHx8IGlzLnN2ZyhhKSxcbiAgICBzdHI6IGEgPT4gdHlwZW9mIGEgPT09ICdzdHJpbmcnLFxuICAgIGZuYzogYSA9PiB0eXBlb2YgYSA9PT0gJ2Z1bmN0aW9uJyxcbiAgICB1bmQ6IGEgPT4gdHlwZW9mIGEgPT09ICd1bmRlZmluZWQnLFxuICAgIGhleDogYSA9PiAvKF4jWzAtOUEtRl17Nn0kKXwoXiNbMC05QS1GXXszfSQpL2kudGVzdChhKSxcbiAgICByZ2I6IGEgPT4gL15yZ2IvLnRlc3QoYSksXG4gICAgaHNsOiBhID0+IC9eaHNsLy50ZXN0KGEpLFxuICAgIGNvbDogYSA9PiAoaXMuaGV4KGEpIHx8IGlzLnJnYihhKSB8fCBpcy5oc2woYSkpXG4gIH1cblxuICAvLyBCZXppZXJFYXNpbmcgaHR0cHM6Ly9naXRodWIuY29tL2dyZS9iZXppZXItZWFzaW5nXG5cbiAgY29uc3QgYmV6aWVyID0gKCgpID0+IHtcblxuICAgIGNvbnN0IGtTcGxpbmVUYWJsZVNpemUgPSAxMTtcbiAgICBjb25zdCBrU2FtcGxlU3RlcFNpemUgPSAxLjAgLyAoa1NwbGluZVRhYmxlU2l6ZSAtIDEuMCk7XG5cbiAgICBmdW5jdGlvbiBBIChhQTEsIGFBMikgeyByZXR1cm4gMS4wIC0gMy4wICogYUEyICsgMy4wICogYUExIH07XG4gICAgZnVuY3Rpb24gQiAoYUExLCBhQTIpIHsgcmV0dXJuIDMuMCAqIGFBMiAtIDYuMCAqIGFBMSB9O1xuICAgIGZ1bmN0aW9uIEMgKGFBMSkgICAgICB7IHJldHVybiAzLjAgKiBhQTEgfTtcblxuICAgIGZ1bmN0aW9uIGNhbGNCZXppZXIgKGFULCBhQTEsIGFBMikgeyByZXR1cm4gKChBKGFBMSwgYUEyKSAqIGFUICsgQihhQTEsIGFBMikpICogYVQgKyBDKGFBMSkpICogYVQgfTtcbiAgICBmdW5jdGlvbiBnZXRTbG9wZSAoYVQsIGFBMSwgYUEyKSB7IHJldHVybiAzLjAgKiBBKGFBMSwgYUEyKSAqIGFUICogYVQgKyAyLjAgKiBCKGFBMSwgYUEyKSAqIGFUICsgQyhhQTEpIH07XG5cbiAgICBmdW5jdGlvbiBiaW5hcnlTdWJkaXZpZGUgKGFYLCBhQSwgYUIsIG1YMSwgbVgyKSB7XG4gICAgICBsZXQgY3VycmVudFgsIGN1cnJlbnRULCBpID0gMDtcbiAgICAgIGRvIHtcbiAgICAgICAgY3VycmVudFQgPSBhQSArIChhQiAtIGFBKSAvIDIuMDtcbiAgICAgICAgY3VycmVudFggPSBjYWxjQmV6aWVyKGN1cnJlbnRULCBtWDEsIG1YMikgLSBhWDtcbiAgICAgICAgaWYgKGN1cnJlbnRYID4gMC4wKSB7IGFCID0gY3VycmVudFQgfSBlbHNlIHsgYUEgPSBjdXJyZW50VCB9O1xuICAgICAgfSB3aGlsZSAoTWF0aC5hYnMoY3VycmVudFgpID4gMC4wMDAwMDAxICYmICsraSA8IDEwKTtcbiAgICAgIHJldHVybiBjdXJyZW50VDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXd0b25SYXBoc29uSXRlcmF0ZSAoYVgsIGFHdWVzc1QsIG1YMSwgbVgyKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7ICsraSkge1xuICAgICAgICBjb25zdCBjdXJyZW50U2xvcGUgPSBnZXRTbG9wZShhR3Vlc3NULCBtWDEsIG1YMik7XG4gICAgICAgIGlmIChjdXJyZW50U2xvcGUgPT09IDAuMCkgcmV0dXJuIGFHdWVzc1Q7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRYID0gY2FsY0JlemllcihhR3Vlc3NULCBtWDEsIG1YMikgLSBhWDtcbiAgICAgICAgYUd1ZXNzVCAtPSBjdXJyZW50WCAvIGN1cnJlbnRTbG9wZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhR3Vlc3NUO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJlemllcihtWDEsIG1ZMSwgbVgyLCBtWTIpIHtcblxuICAgICAgaWYgKCEoMCA8PSBtWDEgJiYgbVgxIDw9IDEgJiYgMCA8PSBtWDIgJiYgbVgyIDw9IDEpKSByZXR1cm47XG4gICAgICBsZXQgc2FtcGxlVmFsdWVzID0gbmV3IEZsb2F0MzJBcnJheShrU3BsaW5lVGFibGVTaXplKTtcblxuICAgICAgaWYgKG1YMSAhPT0gbVkxIHx8IG1YMiAhPT0gbVkyKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwga1NwbGluZVRhYmxlU2l6ZTsgKytpKSB7XG4gICAgICAgICAgc2FtcGxlVmFsdWVzW2ldID0gY2FsY0JlemllcihpICoga1NhbXBsZVN0ZXBTaXplLCBtWDEsIG1YMik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0VEZvclgoYVgpIHtcblxuICAgICAgICBsZXQgaW50ZXJ2YWxTdGFydCA9IDAuMDtcbiAgICAgICAgbGV0IGN1cnJlbnRTYW1wbGUgPSAxO1xuICAgICAgICBjb25zdCBsYXN0U2FtcGxlID0ga1NwbGluZVRhYmxlU2l6ZSAtIDE7XG5cbiAgICAgICAgZm9yICg7IGN1cnJlbnRTYW1wbGUgIT09IGxhc3RTYW1wbGUgJiYgc2FtcGxlVmFsdWVzW2N1cnJlbnRTYW1wbGVdIDw9IGFYOyArK2N1cnJlbnRTYW1wbGUpIHtcbiAgICAgICAgICBpbnRlcnZhbFN0YXJ0ICs9IGtTYW1wbGVTdGVwU2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC0tY3VycmVudFNhbXBsZTtcblxuICAgICAgICBjb25zdCBkaXN0ID0gKGFYIC0gc2FtcGxlVmFsdWVzW2N1cnJlbnRTYW1wbGVdKSAvIChzYW1wbGVWYWx1ZXNbY3VycmVudFNhbXBsZSArIDFdIC0gc2FtcGxlVmFsdWVzW2N1cnJlbnRTYW1wbGVdKTtcbiAgICAgICAgY29uc3QgZ3Vlc3NGb3JUID0gaW50ZXJ2YWxTdGFydCArIGRpc3QgKiBrU2FtcGxlU3RlcFNpemU7XG4gICAgICAgIGNvbnN0IGluaXRpYWxTbG9wZSA9IGdldFNsb3BlKGd1ZXNzRm9yVCwgbVgxLCBtWDIpO1xuXG4gICAgICAgIGlmIChpbml0aWFsU2xvcGUgPj0gMC4wMDEpIHtcbiAgICAgICAgICByZXR1cm4gbmV3dG9uUmFwaHNvbkl0ZXJhdGUoYVgsIGd1ZXNzRm9yVCwgbVgxLCBtWDIpO1xuICAgICAgICB9IGVsc2UgaWYgKGluaXRpYWxTbG9wZSA9PT0gMC4wKSB7XG4gICAgICAgICAgcmV0dXJuIGd1ZXNzRm9yVDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gYmluYXJ5U3ViZGl2aWRlKGFYLCBpbnRlcnZhbFN0YXJ0LCBpbnRlcnZhbFN0YXJ0ICsga1NhbXBsZVN0ZXBTaXplLCBtWDEsIG1YMik7XG4gICAgICAgIH1cblxuICAgICAgfVxuXG4gICAgICByZXR1cm4geCA9PiB7XG4gICAgICAgIGlmIChtWDEgPT09IG1ZMSAmJiBtWDIgPT09IG1ZMikgcmV0dXJuIHg7XG4gICAgICAgIGlmICh4ID09PSAwKSByZXR1cm4gMDtcbiAgICAgICAgaWYgKHggPT09IDEpIHJldHVybiAxO1xuICAgICAgICByZXR1cm4gY2FsY0JlemllcihnZXRURm9yWCh4KSwgbVkxLCBtWTIpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIGJlemllcjtcblxuICB9KSgpO1xuXG4gIGNvbnN0IGVhc2luZ3MgPSAoKCkgPT4ge1xuXG4gICAgY29uc3QgbmFtZXMgPSBbJ1F1YWQnLCAnQ3ViaWMnLCAnUXVhcnQnLCAnUXVpbnQnLCAnU2luZScsICdFeHBvJywgJ0NpcmMnLCAnQmFjaycsICdFbGFzdGljJ107XG5cbiAgICAvLyBFbGFzdGljIGVhc2luZyBhZGFwdGVkIGZyb20galF1ZXJ5VUkgaHR0cDovL2FwaS5qcXVlcnl1aS5jb20vZWFzaW5ncy9cblxuICAgIGZ1bmN0aW9uIGVsYXN0aWModCwgcCkge1xuICAgICAgcmV0dXJuIHQgPT09IDAgfHwgdCA9PT0gMSA/IHQgOlxuICAgICAgLU1hdGgucG93KDIsIDEwICogKHQgLSAxKSkgKiBNYXRoLnNpbigoKCh0IC0gMSkgLSAocCAvIChNYXRoLlBJICogMi4wKSAqIE1hdGguYXNpbigxKSkpICogKE1hdGguUEkgKiAyKSkgLyBwICk7XG4gICAgfVxuXG4gICAgLy8gQXBwcm94aW1hdGVkIFBlbm5lciBlcXVhdGlvbnMgaHR0cDovL21hdHRoZXdsZWluLmNvbS9jZWFzZXIvXG5cbiAgICBjb25zdCBlcXVhdGlvbnMgPSB7XG4gICAgICBJbjogW1xuICAgICAgICBbMC41NTAsIDAuMDg1LCAwLjY4MCwgMC41MzBdLCAvKiBJblF1YWQgKi9cbiAgICAgICAgWzAuNTUwLCAwLjA1NSwgMC42NzUsIDAuMTkwXSwgLyogSW5DdWJpYyAqL1xuICAgICAgICBbMC44OTUsIDAuMDMwLCAwLjY4NSwgMC4yMjBdLCAvKiBJblF1YXJ0ICovXG4gICAgICAgIFswLjc1NSwgMC4wNTAsIDAuODU1LCAwLjA2MF0sIC8qIEluUXVpbnQgKi9cbiAgICAgICAgWzAuNDcwLCAwLjAwMCwgMC43NDUsIDAuNzE1XSwgLyogSW5TaW5lICovXG4gICAgICAgIFswLjk1MCwgMC4wNTAsIDAuNzk1LCAwLjAzNV0sIC8qIEluRXhwbyAqL1xuICAgICAgICBbMC42MDAsIDAuMDQwLCAwLjk4MCwgMC4zMzVdLCAvKiBJbkNpcmMgKi9cbiAgICAgICAgWzAuNjAwLCAtMC4yODAsIDAuNzM1LCAwLjA0NV0sIC8qIEluQmFjayAqL1xuICAgICAgICBlbGFzdGljIC8qIEluRWxhc3RpYyAqL1xuICAgICAgXSwgT3V0OiBbXG4gICAgICAgIFswLjI1MCwgMC40NjAsIDAuNDUwLCAwLjk0MF0sIC8qIE91dFF1YWQgKi9cbiAgICAgICAgWzAuMjE1LCAwLjYxMCwgMC4zNTUsIDEuMDAwXSwgLyogT3V0Q3ViaWMgKi9cbiAgICAgICAgWzAuMTY1LCAwLjg0MCwgMC40NDAsIDEuMDAwXSwgLyogT3V0UXVhcnQgKi9cbiAgICAgICAgWzAuMjMwLCAxLjAwMCwgMC4zMjAsIDEuMDAwXSwgLyogT3V0UXVpbnQgKi9cbiAgICAgICAgWzAuMzkwLCAwLjU3NSwgMC41NjUsIDEuMDAwXSwgLyogT3V0U2luZSAqL1xuICAgICAgICBbMC4xOTAsIDEuMDAwLCAwLjIyMCwgMS4wMDBdLCAvKiBPdXRFeHBvICovXG4gICAgICAgIFswLjA3NSwgMC44MjAsIDAuMTY1LCAxLjAwMF0sIC8qIE91dENpcmMgKi9cbiAgICAgICAgWzAuMTc1LCAwLjg4NSwgMC4zMjAsIDEuMjc1XSwgLyogT3V0QmFjayAqL1xuICAgICAgICAodCwgZikgPT4gMSAtIGVsYXN0aWMoMSAtIHQsIGYpIC8qIE91dEVsYXN0aWMgKi9cbiAgICAgIF0sIEluT3V0OiBbXG4gICAgICAgIFswLjQ1NSwgMC4wMzAsIDAuNTE1LCAwLjk1NV0sIC8qIEluT3V0UXVhZCAqL1xuICAgICAgICBbMC42NDUsIDAuMDQ1LCAwLjM1NSwgMS4wMDBdLCAvKiBJbk91dEN1YmljICovXG4gICAgICAgIFswLjc3MCwgMC4wMDAsIDAuMTc1LCAxLjAwMF0sIC8qIEluT3V0UXVhcnQgKi9cbiAgICAgICAgWzAuODYwLCAwLjAwMCwgMC4wNzAsIDEuMDAwXSwgLyogSW5PdXRRdWludCAqL1xuICAgICAgICBbMC40NDUsIDAuMDUwLCAwLjU1MCwgMC45NTBdLCAvKiBJbk91dFNpbmUgKi9cbiAgICAgICAgWzEuMDAwLCAwLjAwMCwgMC4wMDAsIDEuMDAwXSwgLyogSW5PdXRFeHBvICovXG4gICAgICAgIFswLjc4NSwgMC4xMzUsIDAuMTUwLCAwLjg2MF0sIC8qIEluT3V0Q2lyYyAqL1xuICAgICAgICBbMC42ODAsIC0wLjU1MCwgMC4yNjUsIDEuNTUwXSwgLyogSW5PdXRCYWNrICovXG4gICAgICAgICh0LCBmKSA9PiB0IDwgLjUgPyBlbGFzdGljKHQgKiAyLCBmKSAvIDIgOiAxIC0gZWxhc3RpYyh0ICogLTIgKyAyLCBmKSAvIDIgLyogSW5PdXRFbGFzdGljICovXG4gICAgICBdXG4gICAgfVxuXG4gICAgbGV0IGZ1bmN0aW9ucyA9IHtcbiAgICAgIGxpbmVhcjogYmV6aWVyKDAuMjUwLCAwLjI1MCwgMC43NTAsIDAuNzUwKVxuICAgIH1cblxuICAgIGZvciAobGV0IHR5cGUgaW4gZXF1YXRpb25zKSB7XG4gICAgICBlcXVhdGlvbnNbdHlwZV0uZm9yRWFjaCgoZiwgaSkgPT4ge1xuICAgICAgICBmdW5jdGlvbnNbJ2Vhc2UnK3R5cGUrbmFtZXNbaV1dID0gaXMuZm5jKGYpID8gZiA6IGJlemllci5hcHBseSh0aGlzLCBmKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbnM7XG5cbiAgfSkoKTtcblxuICAvLyBTdHJpbmdzXG5cbiAgZnVuY3Rpb24gc3RyaW5nVG9IeXBoZW5zKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlbGVjdFN0cmluZyhzdHIpIHtcbiAgICBpZiAoaXMuY29sKHN0cikpIHJldHVybjtcbiAgICB0cnkge1xuICAgICAgbGV0IG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzdHIpO1xuICAgICAgcmV0dXJuIG5vZGVzO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFycmF5c1xuXG4gIGZ1bmN0aW9uIGZpbHRlckFycmF5KGFyciwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBsZW4gPSBhcnIubGVuZ3RoO1xuICAgIGNvbnN0IHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID49IDIgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChpIGluIGFycikge1xuICAgICAgICBjb25zdCB2YWwgPSBhcnJbaV07XG4gICAgICAgIGlmIChjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHZhbCwgaSwgYXJyKSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZsYXR0ZW5BcnJheShhcnIpIHtcbiAgICByZXR1cm4gYXJyLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoaXMuYXJyKGIpID8gZmxhdHRlbkFycmF5KGIpIDogYiksIFtdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvQXJyYXkobykge1xuICAgIGlmIChpcy5hcnIobykpIHJldHVybiBvO1xuICAgIGlmIChpcy5zdHIobykpIG8gPSBzZWxlY3RTdHJpbmcobykgfHwgbztcbiAgICBpZiAobyBpbnN0YW5jZW9mIE5vZGVMaXN0IHx8IG8gaW5zdGFuY2VvZiBIVE1MQ29sbGVjdGlvbikgcmV0dXJuIFtdLnNsaWNlLmNhbGwobyk7XG4gICAgcmV0dXJuIFtvXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5Q29udGFpbnMoYXJyLCB2YWwpIHtcbiAgICByZXR1cm4gYXJyLnNvbWUoYSA9PiBhID09PSB2YWwpO1xuICB9XG5cbiAgLy8gT2JqZWN0c1xuXG4gIGZ1bmN0aW9uIGNsb25lT2JqZWN0KG8pIHtcbiAgICBsZXQgY2xvbmUgPSB7fTtcbiAgICBmb3IgKGxldCBwIGluIG8pIGNsb25lW3BdID0gb1twXTtcbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlT2JqZWN0UHJvcHMobzEsIG8yKSB7XG4gICAgbGV0IG8gPSBjbG9uZU9iamVjdChvMSk7XG4gICAgZm9yIChsZXQgcCBpbiBvMSkgb1twXSA9IG8yLmhhc093blByb3BlcnR5KHApID8gbzJbcF0gOiBvMVtwXTtcbiAgICByZXR1cm4gbztcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlT2JqZWN0cyhvMSwgbzIpIHtcbiAgICBsZXQgbyA9IGNsb25lT2JqZWN0KG8xKTtcbiAgICBmb3IgKGxldCBwIGluIG8yKSBvW3BdID0gaXMudW5kKG8xW3BdKSA/IG8yW3BdIDogbzFbcF07XG4gICAgcmV0dXJuIG87XG4gIH1cblxuICAvLyBDb2xvcnNcblxuICBmdW5jdGlvbiByZ2JUb1JnYmEocmdiVmFsdWUpIHtcbiAgICBjb25zdCByZ2IgPSAvcmdiXFwoKFxcZCssXFxzKltcXGRdKyxcXHMqW1xcZF0rKVxcKS9nLmV4ZWMocmdiVmFsdWUpO1xuICAgIHJldHVybiByZ2IgPyBgcmdiYSgke3JnYlsxXX0sMSlgIDogcmdiVmFsdWU7XG4gIH1cblxuICBmdW5jdGlvbiBoZXhUb1JnYmEoaGV4VmFsdWUpIHtcbiAgICBjb25zdCByZ3ggPSAvXiM/KFthLWZcXGRdKShbYS1mXFxkXSkoW2EtZlxcZF0pJC9pO1xuICAgIGNvbnN0IGhleCA9IGhleFZhbHVlLnJlcGxhY2Uocmd4LCAobSwgciwgZywgYikgPT4gciArIHIgKyBnICsgZyArIGIgKyBiICk7XG4gICAgY29uc3QgcmdiID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gICAgY29uc3QgciA9IHBhcnNlSW50KHJnYlsxXSwgMTYpO1xuICAgIGNvbnN0IGcgPSBwYXJzZUludChyZ2JbMl0sIDE2KTtcbiAgICBjb25zdCBiID0gcGFyc2VJbnQocmdiWzNdLCAxNik7XG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sJHtnfSwke2J9LDEpYDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhzbFRvUmdiYShoc2xWYWx1ZSkge1xuICAgIGNvbnN0IGhzbCA9IC9oc2xcXCgoXFxkKyksXFxzKihbXFxkLl0rKSUsXFxzKihbXFxkLl0rKSVcXCkvZy5leGVjKGhzbFZhbHVlKSB8fCAvaHNsYVxcKChcXGQrKSxcXHMqKFtcXGQuXSspJSxcXHMqKFtcXGQuXSspJSxcXHMqKFtcXGQuXSspXFwpL2cuZXhlYyhoc2xWYWx1ZSk7XG4gICAgY29uc3QgaCA9IHBhcnNlSW50KGhzbFsxXSkgLyAzNjA7XG4gICAgY29uc3QgcyA9IHBhcnNlSW50KGhzbFsyXSkgLyAxMDA7XG4gICAgY29uc3QgbCA9IHBhcnNlSW50KGhzbFszXSkgLyAxMDA7XG4gICAgY29uc3QgYSA9IGhzbFs0XSB8fCAxO1xuICAgIGZ1bmN0aW9uIGh1ZTJyZ2IocCwgcSwgdCkge1xuICAgICAgaWYgKHQgPCAwKSB0ICs9IDE7XG4gICAgICBpZiAodCA+IDEpIHQgLT0gMTtcbiAgICAgIGlmICh0IDwgMS82KSByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgIGlmICh0IDwgMS8yKSByZXR1cm4gcTtcbiAgICAgIGlmICh0IDwgMi8zKSByZXR1cm4gcCArIChxIC0gcCkgKiAoMi8zIC0gdCkgKiA2O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICAgIGxldCByLCBnLCBiO1xuICAgIGlmIChzID09IDApIHtcbiAgICAgIHIgPSBnID0gYiA9IGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHEgPSBsIDwgMC41ID8gbCAqICgxICsgcykgOiBsICsgcyAtIGwgKiBzO1xuICAgICAgY29uc3QgcCA9IDIgKiBsIC0gcTtcbiAgICAgIHIgPSBodWUycmdiKHAsIHEsIGggKyAxLzMpO1xuICAgICAgZyA9IGh1ZTJyZ2IocCwgcSwgaCk7XG4gICAgICBiID0gaHVlMnJnYihwLCBxLCBoIC0gMS8zKTtcbiAgICB9XG4gICAgcmV0dXJuIGByZ2JhKCR7ciAqIDI1NX0sJHtnICogMjU1fSwke2IgKiAyNTV9LCR7YX0pYDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbG9yVG9SZ2IodmFsKSB7XG4gICAgaWYgKGlzLnJnYih2YWwpKSByZXR1cm4gcmdiVG9SZ2JhKHZhbCk7XG4gICAgaWYgKGlzLmhleCh2YWwpKSByZXR1cm4gaGV4VG9SZ2JhKHZhbCk7XG4gICAgaWYgKGlzLmhzbCh2YWwpKSByZXR1cm4gaHNsVG9SZ2JhKHZhbCk7XG4gIH1cblxuICAvLyBVbml0c1xuXG4gIGZ1bmN0aW9uIGdldFVuaXQodmFsKSB7XG4gICAgY29uc3Qgc3BsaXQgPSAvKFtcXCtcXC1dP1swLTkjXFwuXSspKCV8cHh8cHR8ZW18cmVtfGlufGNtfG1tfGV4fGNofHBjfHZ3fHZofHZtaW58dm1heHxkZWd8cmFkfHR1cm4pPyQvLmV4ZWModmFsKTtcbiAgICBpZiAoc3BsaXQpIHJldHVybiBzcGxpdFsyXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRyYW5zZm9ybVVuaXQocHJvcE5hbWUpIHtcbiAgICBpZiAoc3RyaW5nQ29udGFpbnMocHJvcE5hbWUsICd0cmFuc2xhdGUnKSB8fCBwcm9wTmFtZSA9PT0gJ3BlcnNwZWN0aXZlJykgcmV0dXJuICdweCc7XG4gICAgaWYgKHN0cmluZ0NvbnRhaW5zKHByb3BOYW1lLCAncm90YXRlJykgfHwgc3RyaW5nQ29udGFpbnMocHJvcE5hbWUsICdza2V3JykpIHJldHVybiAnZGVnJztcbiAgfVxuXG4gIC8vIFZhbHVlc1xuXG4gIGZ1bmN0aW9uIG1pbk1heFZhbHVlKHZhbCwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgodmFsLCBtaW4pLCBtYXgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RnVuY3Rpb25WYWx1ZSh2YWwsIGFuaW1hdGFibGUpIHtcbiAgICBpZiAoIWlzLmZuYyh2YWwpKSByZXR1cm4gdmFsO1xuICAgIHJldHVybiB2YWwoYW5pbWF0YWJsZS50YXJnZXQsIGFuaW1hdGFibGUuaWQsIGFuaW1hdGFibGUudG90YWwpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q1NTVmFsdWUoZWwsIHByb3ApIHtcbiAgICBpZiAocHJvcCBpbiBlbC5zdHlsZSkge1xuICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUoc3RyaW5nVG9IeXBoZW5zKHByb3ApKSB8fCAnMCc7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QW5pbWF0aW9uVHlwZShlbCwgcHJvcCkge1xuICAgIGlmIChpcy5kb20oZWwpICYmIGFycmF5Q29udGFpbnModmFsaWRUcmFuc2Zvcm1zLCBwcm9wKSkgcmV0dXJuICd0cmFuc2Zvcm0nO1xuICAgIGlmIChpcy5kb20oZWwpICYmIChlbC5nZXRBdHRyaWJ1dGUocHJvcCkgfHwgKGlzLnN2ZyhlbCkgJiYgZWxbcHJvcF0pKSkgcmV0dXJuICdhdHRyaWJ1dGUnO1xuICAgIGlmIChpcy5kb20oZWwpICYmIChwcm9wICE9PSAndHJhbnNmb3JtJyAmJiBnZXRDU1NWYWx1ZShlbCwgcHJvcCkpKSByZXR1cm4gJ2Nzcyc7XG4gICAgaWYgKGVsW3Byb3BdICE9IG51bGwpIHJldHVybiAnb2JqZWN0JztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRyYW5zZm9ybVZhbHVlKGVsLCBwcm9wTmFtZSkge1xuICAgIGNvbnN0IGRlZmF1bHRVbml0ID0gZ2V0VHJhbnNmb3JtVW5pdChwcm9wTmFtZSk7XG4gICAgY29uc3QgZGVmYXVsdFZhbCA9IHN0cmluZ0NvbnRhaW5zKHByb3BOYW1lLCAnc2NhbGUnKSA/IDEgOiAwICsgZGVmYXVsdFVuaXQ7XG4gICAgY29uc3Qgc3RyID0gZWwuc3R5bGUudHJhbnNmb3JtO1xuICAgIGlmICghc3RyKSByZXR1cm4gZGVmYXVsdFZhbDtcbiAgICBsZXQgbWF0Y2ggPSBbXTtcbiAgICBsZXQgcHJvcHMgPSBbXTtcbiAgICBsZXQgdmFsdWVzID0gW107XG4gICAgY29uc3Qgcmd4ID0gLyhcXHcrKVxcKCguKz8pXFwpL2c7XG4gICAgd2hpbGUgKG1hdGNoID0gcmd4LmV4ZWMoc3RyKSkge1xuICAgICAgcHJvcHMucHVzaChtYXRjaFsxXSk7XG4gICAgICB2YWx1ZXMucHVzaChtYXRjaFsyXSk7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gZmlsdGVyQXJyYXkodmFsdWVzLCAodmFsLCBpKSA9PiBwcm9wc1tpXSA9PT0gcHJvcE5hbWUpO1xuICAgIHJldHVybiB2YWx1ZS5sZW5ndGggPyB2YWx1ZVswXSA6IGRlZmF1bHRWYWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPcmlnaW5hbFRhcmdldFZhbHVlKHRhcmdldCwgcHJvcE5hbWUpIHtcbiAgICBzd2l0Y2ggKGdldEFuaW1hdGlvblR5cGUodGFyZ2V0LCBwcm9wTmFtZSkpIHtcbiAgICAgIGNhc2UgJ3RyYW5zZm9ybSc6IHJldHVybiBnZXRUcmFuc2Zvcm1WYWx1ZSh0YXJnZXQsIHByb3BOYW1lKTtcbiAgICAgIGNhc2UgJ2Nzcyc6IHJldHVybiBnZXRDU1NWYWx1ZSh0YXJnZXQsIHByb3BOYW1lKTtcbiAgICAgIGNhc2UgJ2F0dHJpYnV0ZSc6IHJldHVybiB0YXJnZXQuZ2V0QXR0cmlidXRlKHByb3BOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldFtwcm9wTmFtZV0gfHwgMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlbGF0aXZlVmFsdWUodG8sIGZyb20pIHtcbiAgICBjb25zdCBvcGVyYXRvciA9IC9eKFxcKj18XFwrPXwtPSkvLmV4ZWModG8pO1xuICAgIGlmICghb3BlcmF0b3IpIHJldHVybiB0bztcbiAgICBjb25zdCB1ID0gZ2V0VW5pdCh0bykgfHwgMDtcbiAgICBjb25zdCB4ID0gcGFyc2VGbG9hdChmcm9tKTtcbiAgICBjb25zdCB5ID0gcGFyc2VGbG9hdCh0by5yZXBsYWNlKG9wZXJhdG9yWzBdLCAnJykpO1xuICAgIHN3aXRjaCAob3BlcmF0b3JbMF1bMF0pIHtcbiAgICAgIGNhc2UgJysnOiByZXR1cm4geCArIHkgKyB1O1xuICAgICAgY2FzZSAnLSc6IHJldHVybiB4IC0geSArIHU7XG4gICAgICBjYXNlICcqJzogcmV0dXJuIHggKiB5ICsgdTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKHZhbCwgdW5pdCkge1xuICAgIGlmIChpcy5jb2wodmFsKSkgcmV0dXJuIGNvbG9yVG9SZ2IodmFsKTtcbiAgICBjb25zdCBvcmlnaW5hbFVuaXQgPSBnZXRVbml0KHZhbCk7XG4gICAgY29uc3QgdW5pdExlc3MgPSBvcmlnaW5hbFVuaXQgPyB2YWwuc3Vic3RyKDAsIHZhbC5sZW5ndGggLSBvcmlnaW5hbFVuaXQubGVuZ3RoKSA6IHZhbDtcbiAgICByZXR1cm4gdW5pdCAmJiAhL1xccy9nLnRlc3QodmFsKSA/IHVuaXRMZXNzICsgdW5pdCA6IHVuaXRMZXNzO1xuICB9XG5cbiAgLy8gZ2V0VG90YWxMZW5ndGgoKSBlcXVpdmFsZW50IGZvciBjaXJjbGUsIHJlY3QsIHBvbHlsaW5lLCBwb2x5Z29uIGFuZCBsaW5lIHNoYXBlcy4gXG4gIC8vIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9TZWJMYW1ibGEvM2UwNTUwYzQ5NmMyMzY3MDk3NDRcblxuICBmdW5jdGlvbiBnZXREaXN0YW5jZShwMSwgcDIpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHAyLnggLSBwMS54LCAyKSArIE1hdGgucG93KHAyLnkgLSBwMS55LCAyKSk7IFxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q2lyY2xlTGVuZ3RoKGVsKSB7XG4gICAgcmV0dXJuIDIgKiBNYXRoLlBJICogZWwuZ2V0QXR0cmlidXRlKCdyJyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWN0TGVuZ3RoKGVsKSB7XG4gICAgcmV0dXJuIChlbC5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykgKiAyKSArIChlbC5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpICogMik7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMaW5lTGVuZ3RoKGVsKSB7XG4gICAgcmV0dXJuIGdldERpc3RhbmNlKFxuICAgICAge3g6IGVsLmdldEF0dHJpYnV0ZSgneDEnKSwgeTogZWwuZ2V0QXR0cmlidXRlKCd5MScpfSwgXG4gICAgICB7eDogZWwuZ2V0QXR0cmlidXRlKCd4MicpLCB5OiBlbC5nZXRBdHRyaWJ1dGUoJ3kyJyl9XG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBvbHlsaW5lTGVuZ3RoKGVsKSB7XG4gICAgY29uc3QgcG9pbnRzID0gZWwucG9pbnRzO1xuICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG4gICAgbGV0IHByZXZpb3VzUG9zO1xuICAgIGZvciAobGV0IGkgPSAwIDsgaSA8IHBvaW50cy5udW1iZXJPZkl0ZW1zOyBpKyspIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRQb3MgPSBwb2ludHMuZ2V0SXRlbShpKTtcbiAgICAgIGlmIChpID4gMCkgdG90YWxMZW5ndGggKz0gZ2V0RGlzdGFuY2UocHJldmlvdXNQb3MsIGN1cnJlbnRQb3MpO1xuICAgICAgcHJldmlvdXNQb3MgPSBjdXJyZW50UG9zO1xuICAgIH1cbiAgICByZXR1cm4gdG90YWxMZW5ndGg7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQb2x5Z29uTGVuZ3RoKGVsKSB7XG4gICAgY29uc3QgcG9pbnRzID0gZWwucG9pbnRzO1xuICAgIHJldHVybiBnZXRQb2x5bGluZUxlbmd0aChlbCkgKyBnZXREaXN0YW5jZShwb2ludHMuZ2V0SXRlbShwb2ludHMubnVtYmVyT2ZJdGVtcyAtIDEpLCBwb2ludHMuZ2V0SXRlbSgwKSk7XG4gIH1cblxuICAvLyBQYXRoIGFuaW1hdGlvblxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsTGVuZ3RoKGVsKSB7XG4gICAgaWYgKGVsLmdldFRvdGFsTGVuZ3RoKSByZXR1cm4gZWwuZ2V0VG90YWxMZW5ndGgoKTtcbiAgICBzd2l0Y2goZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gZ2V0Q2lyY2xlTGVuZ3RoKGVsKTtcbiAgICAgIGNhc2UgJ3JlY3QnOiByZXR1cm4gZ2V0UmVjdExlbmd0aChlbCk7XG4gICAgICBjYXNlICdsaW5lJzogcmV0dXJuIGdldExpbmVMZW5ndGgoZWwpO1xuICAgICAgY2FzZSAncG9seWxpbmUnOiByZXR1cm4gZ2V0UG9seWxpbmVMZW5ndGgoZWwpO1xuICAgICAgY2FzZSAncG9seWdvbic6IHJldHVybiBnZXRQb2x5Z29uTGVuZ3RoKGVsKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXREYXNob2Zmc2V0KGVsKSB7XG4gICAgY29uc3QgcGF0aExlbmd0aCA9IGdldFRvdGFsTGVuZ3RoKGVsKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS1kYXNoYXJyYXknLCBwYXRoTGVuZ3RoKTtcbiAgICByZXR1cm4gcGF0aExlbmd0aDtcbiAgfVxuXG4gIC8vIE1vdGlvbiBwYXRoXG5cbiAgZnVuY3Rpb24gZ2V0UGF0aChwYXRoLCBwZXJjZW50KSB7XG4gICAgY29uc3QgZWwgPSBpcy5zdHIocGF0aCkgPyBzZWxlY3RTdHJpbmcocGF0aClbMF0gOiBwYXRoO1xuICAgIGNvbnN0IHAgPSBwZXJjZW50IHx8IDEwMDtcbiAgICByZXR1cm4gZnVuY3Rpb24ocHJvcCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZWw6IGVsLFxuICAgICAgICBwcm9wZXJ0eTogcHJvcCxcbiAgICAgICAgdG90YWxMZW5ndGg6IGdldFRvdGFsTGVuZ3RoKGVsKSAqIChwIC8gMTAwKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhdGhQcm9ncmVzcyhwYXRoLCBwcm9ncmVzcykge1xuICAgIGZ1bmN0aW9uIHBvaW50KG9mZnNldCA9IDApIHtcbiAgICAgIGNvbnN0IGwgPSBwcm9ncmVzcyArIG9mZnNldCA+PSAxID8gcHJvZ3Jlc3MgKyBvZmZzZXQgOiAwO1xuICAgICAgcmV0dXJuIHBhdGguZWwuZ2V0UG9pbnRBdExlbmd0aChsKTtcbiAgICB9XG4gICAgY29uc3QgcCA9IHBvaW50KCk7XG4gICAgY29uc3QgcDAgPSBwb2ludCgtMSk7XG4gICAgY29uc3QgcDEgPSBwb2ludCgrMSk7XG4gICAgc3dpdGNoIChwYXRoLnByb3BlcnR5KSB7XG4gICAgICBjYXNlICd4JzogcmV0dXJuIHAueDtcbiAgICAgIGNhc2UgJ3knOiByZXR1cm4gcC55O1xuICAgICAgY2FzZSAnYW5nbGUnOiByZXR1cm4gTWF0aC5hdGFuMihwMS55IC0gcDAueSwgcDEueCAtIHAwLngpICogMTgwIC8gTWF0aC5QSTtcbiAgICB9XG4gIH1cblxuICAvLyBEZWNvbXBvc2UgdmFsdWVcblxuICBmdW5jdGlvbiBkZWNvbXBvc2VWYWx1ZSh2YWwsIHVuaXQpIHtcbiAgICBjb25zdCByZ3ggPSAvLT9cXGQqXFwuP1xcZCsvZztcbiAgICBjb25zdCB2YWx1ZSA9IHZhbGlkYXRlVmFsdWUoKGlzLnB0aCh2YWwpID8gdmFsLnRvdGFsTGVuZ3RoIDogdmFsKSwgdW5pdCkgKyAnJztcbiAgICByZXR1cm4ge1xuICAgICAgb3JpZ2luYWw6IHZhbHVlLFxuICAgICAgbnVtYmVyczogdmFsdWUubWF0Y2gocmd4KSA/IHZhbHVlLm1hdGNoKHJneCkubWFwKE51bWJlcikgOiBbMF0sXG4gICAgICBzdHJpbmdzOiAoaXMuc3RyKHZhbCkgfHwgdW5pdCkgPyB2YWx1ZS5zcGxpdChyZ3gpIDogW11cbiAgICB9XG4gIH1cblxuICAvLyBBbmltYXRhYmxlc1xuXG4gIGZ1bmN0aW9uIHBhcnNlVGFyZ2V0cyh0YXJnZXRzKSB7XG4gICAgY29uc3QgdGFyZ2V0c0FycmF5ID0gdGFyZ2V0cyA/IChmbGF0dGVuQXJyYXkoaXMuYXJyKHRhcmdldHMpID8gdGFyZ2V0cy5tYXAodG9BcnJheSkgOiB0b0FycmF5KHRhcmdldHMpKSkgOiBbXTtcbiAgICByZXR1cm4gZmlsdGVyQXJyYXkodGFyZ2V0c0FycmF5LCAoaXRlbSwgcG9zLCBzZWxmKSA9PiBzZWxmLmluZGV4T2YoaXRlbSkgPT09IHBvcyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRBbmltYXRhYmxlcyh0YXJnZXRzKSB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VUYXJnZXRzKHRhcmdldHMpO1xuICAgIHJldHVybiBwYXJzZWQubWFwKCh0LCBpKSA9PiB7XG4gICAgICByZXR1cm4ge3RhcmdldDogdCwgaWQ6IGksIHRvdGFsOiBwYXJzZWQubGVuZ3RofTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFByb3BlcnRpZXNcblxuICBmdW5jdGlvbiBub3JtYWxpemVQcm9wZXJ0eVR3ZWVucyhwcm9wLCB0d2VlblNldHRpbmdzKSB7XG4gICAgbGV0IHNldHRpbmdzID0gY2xvbmVPYmplY3QodHdlZW5TZXR0aW5ncyk7XG4gICAgaWYgKGlzLmFycihwcm9wKSkge1xuICAgICAgY29uc3QgbCA9IHByb3AubGVuZ3RoO1xuICAgICAgY29uc3QgaXNGcm9tVG8gPSAobCA9PT0gMiAmJiAhaXMub2JqKHByb3BbMF0pKTtcbiAgICAgIGlmICghaXNGcm9tVG8pIHtcbiAgICAgICAgLy8gRHVyYXRpb24gZGl2aWRlZCBieSB0aGUgbnVtYmVyIG9mIHR3ZWVuc1xuICAgICAgICBpZiAoIWlzLmZuYyh0d2VlblNldHRpbmdzLmR1cmF0aW9uKSkgc2V0dGluZ3MuZHVyYXRpb24gPSB0d2VlblNldHRpbmdzLmR1cmF0aW9uIC8gbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRyYW5zZm9ybSBbZnJvbSwgdG9dIHZhbHVlcyBzaG9ydGhhbmQgdG8gYSB2YWxpZCB0d2VlbiB2YWx1ZVxuICAgICAgICBwcm9wID0ge3ZhbHVlOiBwcm9wfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRvQXJyYXkocHJvcCkubWFwKCh2LCBpKSA9PiB7XG4gICAgICAvLyBEZWZhdWx0IGRlbGF5IHZhbHVlIHNob3VsZCBiZSBhcHBsaWVkIG9ubHkgb24gdGhlIGZpcnN0IHR3ZWVuXG4gICAgICBjb25zdCBkZWxheSA9ICFpID8gdHdlZW5TZXR0aW5ncy5kZWxheSA6IDA7XG4gICAgICAvLyBVc2UgcGF0aCBvYmplY3QgYXMgYSB0d2VlbiB2YWx1ZVxuICAgICAgbGV0IG9iaiA9IGlzLm9iaih2KSAmJiAhaXMucHRoKHYpID8gdiA6IHt2YWx1ZTogdn07XG4gICAgICAvLyBTZXQgZGVmYXVsdCBkZWxheSB2YWx1ZVxuICAgICAgaWYgKGlzLnVuZChvYmouZGVsYXkpKSBvYmouZGVsYXkgPSBkZWxheTtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSkubWFwKGsgPT4gbWVyZ2VPYmplY3RzKGssIHNldHRpbmdzKSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0aWVzKGluc3RhbmNlU2V0dGluZ3MsIHR3ZWVuU2V0dGluZ3MsIHBhcmFtcykge1xuICAgIGxldCBwcm9wZXJ0aWVzID0gW107XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBtZXJnZU9iamVjdHMoaW5zdGFuY2VTZXR0aW5ncywgdHdlZW5TZXR0aW5ncyk7XG4gICAgZm9yIChsZXQgcCBpbiBwYXJhbXMpIHtcbiAgICAgIGlmICghc2V0dGluZ3MuaGFzT3duUHJvcGVydHkocCkgJiYgcCAhPT0gJ3RhcmdldHMnKSB7XG4gICAgICAgIHByb3BlcnRpZXMucHVzaCh7XG4gICAgICAgICAgbmFtZTogcCxcbiAgICAgICAgICBvZmZzZXQ6IHNldHRpbmdzWydvZmZzZXQnXSxcbiAgICAgICAgICB0d2VlbnM6IG5vcm1hbGl6ZVByb3BlcnR5VHdlZW5zKHBhcmFtc1twXSwgdHdlZW5TZXR0aW5ncylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9wZXJ0aWVzO1xuICB9XG5cbiAgLy8gVHdlZW5zXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVHdlZW5WYWx1ZXModHdlZW4sIGFuaW1hdGFibGUpIHtcbiAgICBsZXQgdCA9IHt9O1xuICAgIGZvciAobGV0IHAgaW4gdHdlZW4pIHtcbiAgICAgIGxldCB2YWx1ZSA9IGdldEZ1bmN0aW9uVmFsdWUodHdlZW5bcF0sIGFuaW1hdGFibGUpO1xuICAgICAgaWYgKGlzLmFycih2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAodiA9PiBnZXRGdW5jdGlvblZhbHVlKHYsIGFuaW1hdGFibGUpKTtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMSkgdmFsdWUgPSB2YWx1ZVswXTtcbiAgICAgIH1cbiAgICAgIHRbcF0gPSB2YWx1ZTtcbiAgICB9XG4gICAgdC5kdXJhdGlvbiA9IHBhcnNlRmxvYXQodC5kdXJhdGlvbik7XG4gICAgdC5kZWxheSA9IHBhcnNlRmxvYXQodC5kZWxheSk7XG4gICAgcmV0dXJuIHQ7XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVFYXNpbmcodmFsKSB7XG4gICAgcmV0dXJuIGlzLmFycih2YWwpID8gYmV6aWVyLmFwcGx5KHRoaXMsIHZhbCkgOiBlYXNpbmdzW3ZhbF07XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVUd2VlbnMocHJvcCwgYW5pbWF0YWJsZSkge1xuICAgIGxldCBwcmV2aW91c1R3ZWVuO1xuICAgIHJldHVybiBwcm9wLnR3ZWVucy5tYXAodCA9PiB7XG4gICAgICBsZXQgdHdlZW4gPSBub3JtYWxpemVUd2VlblZhbHVlcyh0LCBhbmltYXRhYmxlKTtcbiAgICAgIGNvbnN0IHR3ZWVuVmFsdWUgPSB0d2Vlbi52YWx1ZTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsVmFsdWUgPSBnZXRPcmlnaW5hbFRhcmdldFZhbHVlKGFuaW1hdGFibGUudGFyZ2V0LCBwcm9wLm5hbWUpO1xuICAgICAgY29uc3QgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzVHdlZW4gPyBwcmV2aW91c1R3ZWVuLnRvLm9yaWdpbmFsIDogb3JpZ2luYWxWYWx1ZTtcbiAgICAgIGNvbnN0IGZyb20gPSBpcy5hcnIodHdlZW5WYWx1ZSkgPyB0d2VlblZhbHVlWzBdIDogcHJldmlvdXNWYWx1ZTtcbiAgICAgIGNvbnN0IHRvID0gZ2V0UmVsYXRpdmVWYWx1ZShpcy5hcnIodHdlZW5WYWx1ZSkgPyB0d2VlblZhbHVlWzFdIDogdHdlZW5WYWx1ZSwgZnJvbSk7XG4gICAgICBjb25zdCB1bml0ID0gZ2V0VW5pdCh0bykgfHwgZ2V0VW5pdChmcm9tKSB8fCBnZXRVbml0KG9yaWdpbmFsVmFsdWUpO1xuICAgICAgdHdlZW4uZnJvbSA9IGRlY29tcG9zZVZhbHVlKGZyb20sIHVuaXQpO1xuICAgICAgdHdlZW4udG8gPSBkZWNvbXBvc2VWYWx1ZSh0bywgdW5pdCk7XG4gICAgICB0d2Vlbi5zdGFydCA9IHByZXZpb3VzVHdlZW4gPyBwcmV2aW91c1R3ZWVuLmVuZCA6IHByb3Aub2Zmc2V0O1xuICAgICAgdHdlZW4uZW5kID0gdHdlZW4uc3RhcnQgKyB0d2Vlbi5kZWxheSArIHR3ZWVuLmR1cmF0aW9uO1xuICAgICAgdHdlZW4uZWFzaW5nID0gbm9ybWFsaXplRWFzaW5nKHR3ZWVuLmVhc2luZyk7XG4gICAgICB0d2Vlbi5lbGFzdGljaXR5ID0gKDEwMDAgLSBtaW5NYXhWYWx1ZSh0d2Vlbi5lbGFzdGljaXR5LCAxLCA5OTkpKSAvIDEwMDA7XG4gICAgICB0d2Vlbi5pc1BhdGggPSBpcy5wdGgodHdlZW5WYWx1ZSk7XG4gICAgICB0d2Vlbi5pc0NvbG9yID0gaXMuY29sKHR3ZWVuLmZyb20ub3JpZ2luYWwpO1xuICAgICAgaWYgKHR3ZWVuLmlzQ29sb3IpIHR3ZWVuLnJvdW5kID0gMTtcbiAgICAgIHByZXZpb3VzVHdlZW4gPSB0d2VlbjtcbiAgICAgIHJldHVybiB0d2VlbjtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFR3ZWVuIHByb2dyZXNzXG5cbiAgY29uc3Qgc2V0VHdlZW5Qcm9ncmVzcyA9IHtcbiAgICBjc3M6ICh0LCBwLCB2KSA9PiB0LnN0eWxlW3BdID0gdixcbiAgICBhdHRyaWJ1dGU6ICh0LCBwLCB2KSA9PiB0LnNldEF0dHJpYnV0ZShwLCB2KSxcbiAgICBvYmplY3Q6ICh0LCBwLCB2KSA9PiB0W3BdID0gdixcbiAgICB0cmFuc2Zvcm06ICh0LCBwLCB2LCB0cmFuc2Zvcm1zLCBpZCkgPT4ge1xuICAgICAgaWYgKCF0cmFuc2Zvcm1zW2lkXSkgdHJhbnNmb3Jtc1tpZF0gPSBbXTtcbiAgICAgIHRyYW5zZm9ybXNbaWRdLnB1c2goYCR7cH0oJHt2fSlgKTtcbiAgICB9XG4gIH1cblxuICAvLyBBbmltYXRpb25zXG5cbiAgZnVuY3Rpb24gY3JlYXRlQW5pbWF0aW9uKGFuaW1hdGFibGUsIHByb3ApIHtcbiAgICBjb25zdCBhbmltVHlwZSA9IGdldEFuaW1hdGlvblR5cGUoYW5pbWF0YWJsZS50YXJnZXQsIHByb3AubmFtZSk7XG4gICAgaWYgKGFuaW1UeXBlKSB7XG4gICAgICBjb25zdCB0d2VlbnMgPSBub3JtYWxpemVUd2VlbnMocHJvcCwgYW5pbWF0YWJsZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBhbmltVHlwZSxcbiAgICAgICAgcHJvcGVydHk6IHByb3AubmFtZSxcbiAgICAgICAgYW5pbWF0YWJsZTogYW5pbWF0YWJsZSxcbiAgICAgICAgdHdlZW5zOiB0d2VlbnMsXG4gICAgICAgIGR1cmF0aW9uOiB0d2VlbnNbdHdlZW5zLmxlbmd0aCAtIDFdLmVuZCxcbiAgICAgICAgZGVsYXk6IHR3ZWVuc1swXS5kZWxheVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEFuaW1hdGlvbnMoYW5pbWF0YWJsZXMsIHByb3BlcnRpZXMpIHtcbiAgICByZXR1cm4gZmlsdGVyQXJyYXkoZmxhdHRlbkFycmF5KGFuaW1hdGFibGVzLm1hcChhbmltYXRhYmxlID0+IHtcbiAgICAgIHJldHVybiBwcm9wZXJ0aWVzLm1hcChwcm9wID0+IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUFuaW1hdGlvbihhbmltYXRhYmxlLCBwcm9wKTtcbiAgICAgIH0pO1xuICAgIH0pKSwgYSA9PiAhaXMudW5kKGEpKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSBJbnN0YW5jZVxuXG4gIGZ1bmN0aW9uIGdldEluc3RhbmNlVGltaW5ncyh0eXBlLCBhbmltYXRpb25zLCBpbnN0YW5jZVNldHRpbmdzLCB0d2VlblNldHRpbmdzKSB7XG4gICAgY29uc3QgaXNEZWxheSA9ICh0eXBlID09PSAnZGVsYXknKTtcbiAgICBpZiAoYW5pbWF0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAoaXNEZWxheSA/IE1hdGgubWluIDogTWF0aC5tYXgpLmFwcGx5KE1hdGgsIGFuaW1hdGlvbnMubWFwKGFuaW0gPT4gYW5pbVt0eXBlXSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaXNEZWxheSA/IHR3ZWVuU2V0dGluZ3MuZGVsYXkgOiBpbnN0YW5jZVNldHRpbmdzLm9mZnNldCArIHR3ZWVuU2V0dGluZ3MuZGVsYXkgKyB0d2VlblNldHRpbmdzLmR1cmF0aW9uO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5ld0luc3RhbmNlKHBhcmFtcykge1xuICAgIGNvbnN0IGluc3RhbmNlU2V0dGluZ3MgPSByZXBsYWNlT2JqZWN0UHJvcHMoZGVmYXVsdEluc3RhbmNlU2V0dGluZ3MsIHBhcmFtcyk7XG4gICAgY29uc3QgdHdlZW5TZXR0aW5ncyA9IHJlcGxhY2VPYmplY3RQcm9wcyhkZWZhdWx0VHdlZW5TZXR0aW5ncywgcGFyYW1zKTtcbiAgICBjb25zdCBhbmltYXRhYmxlcyA9IGdldEFuaW1hdGFibGVzKHBhcmFtcy50YXJnZXRzKTtcbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gZ2V0UHJvcGVydGllcyhpbnN0YW5jZVNldHRpbmdzLCB0d2VlblNldHRpbmdzLCBwYXJhbXMpO1xuICAgIGNvbnN0IGFuaW1hdGlvbnMgPSBnZXRBbmltYXRpb25zKGFuaW1hdGFibGVzLCBwcm9wZXJ0aWVzKTtcbiAgICByZXR1cm4gbWVyZ2VPYmplY3RzKGluc3RhbmNlU2V0dGluZ3MsIHtcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgIGFuaW1hdGFibGVzOiBhbmltYXRhYmxlcyxcbiAgICAgIGFuaW1hdGlvbnM6IGFuaW1hdGlvbnMsXG4gICAgICBkdXJhdGlvbjogZ2V0SW5zdGFuY2VUaW1pbmdzKCdkdXJhdGlvbicsIGFuaW1hdGlvbnMsIGluc3RhbmNlU2V0dGluZ3MsIHR3ZWVuU2V0dGluZ3MpLFxuICAgICAgZGVsYXk6IGdldEluc3RhbmNlVGltaW5ncygnZGVsYXknLCBhbmltYXRpb25zLCBpbnN0YW5jZVNldHRpbmdzLCB0d2VlblNldHRpbmdzKVxuICAgIH0pO1xuICB9XG5cbiAgLy8gQ29yZVxuXG4gIGxldCBhY3RpdmVJbnN0YW5jZXMgPSBbXTtcbiAgbGV0IHJhZiA9IDA7XG5cbiAgY29uc3QgZW5naW5lID0gKCgpID0+IHtcbiAgICBmdW5jdGlvbiBwbGF5KCkgeyByYWYgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcCk7IH07XG4gICAgZnVuY3Rpb24gc3RlcCh0KSB7XG4gICAgICBjb25zdCBhY3RpdmVMZW5ndGggPSBhY3RpdmVJbnN0YW5jZXMubGVuZ3RoO1xuICAgICAgaWYgKGFjdGl2ZUxlbmd0aCkge1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgYWN0aXZlTGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKGFjdGl2ZUluc3RhbmNlc1tpXSkgYWN0aXZlSW5zdGFuY2VzW2ldLnRpY2sodCk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIHBsYXkoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHJhZik7XG4gICAgICAgIHJhZiA9IDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwbGF5O1xuICB9KSgpO1xuXG5cbiAgLy8gUHVibGljIEluc3RhbmNlXG5cbiAgZnVuY3Rpb24gYW5pbWUocGFyYW1zID0ge30pIHtcblxuICAgIGxldCBub3csIHN0YXJ0VGltZSwgbGFzdFRpbWUgPSAwO1xuXG4gICAgbGV0IHJlc29sdmUgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gbWFrZVByb21pc2UoKSB7XG4gICAgICByZXR1cm4gd2luZG93LlByb21pc2UgJiYgbmV3IFByb21pc2UoX3Jlc29sdmUgPT4gcmVzb2x2ZSA9IF9yZXNvbHZlKTtcbiAgICB9XG5cbiAgICBsZXQgcHJvbWlzZSA9IG1ha2VQcm9taXNlKCk7XG5cbiAgICBsZXQgaW5zdGFuY2UgPSBjcmVhdGVOZXdJbnN0YW5jZShwYXJhbXMpO1xuXG4gICAgZnVuY3Rpb24gdG9nZ2xlSW5zdGFuY2VEaXJlY3Rpb24oKSB7XG4gICAgICBpbnN0YW5jZS5yZXZlcnNlZCA9ICFpbnN0YW5jZS5yZXZlcnNlZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGp1c3RUaW1lKHRpbWUpIHtcbiAgICAgIHJldHVybiBpbnN0YW5jZS5yZXZlcnNlZCA/IGluc3RhbmNlLmR1cmF0aW9uIC0gdGltZSA6IHRpbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3luY0luc3RhbmNlQ2hpbGRyZW4odGltZSkge1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBpbnN0YW5jZS5jaGlsZHJlbjtcbiAgICAgIGNvbnN0IGNoaWxkcmVuTGVuZ3RoID0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgaWYgKHRpbWUgPj0gaW5zdGFuY2UuY3VycmVudFRpbWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbkxlbmd0aDsgaSsrKSBjaGlsZHJlbltpXS5zZWVrKHRpbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGNoaWxkcmVuTGVuZ3RoOyBpLS07KSBjaGlsZHJlbltpXS5zZWVrKHRpbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldEFuaW1hdGlvbnNQcm9ncmVzcyhpbnNUaW1lKSB7XG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBsZXQgdHJhbnNmb3JtcyA9IHt9O1xuICAgICAgY29uc3QgYW5pbWF0aW9ucyA9IGluc3RhbmNlLmFuaW1hdGlvbnM7XG4gICAgICBjb25zdCBhbmltYXRpb25zTGVuZ3RoID0gYW5pbWF0aW9ucy5sZW5ndGg7XG4gICAgICB3aGlsZSAoaSA8IGFuaW1hdGlvbnNMZW5ndGgpIHtcbiAgICAgICAgY29uc3QgYW5pbSA9IGFuaW1hdGlvbnNbaV07XG4gICAgICAgIGNvbnN0IGFuaW1hdGFibGUgPSBhbmltLmFuaW1hdGFibGU7XG4gICAgICAgIGNvbnN0IHR3ZWVucyA9IGFuaW0udHdlZW5zO1xuICAgICAgICBjb25zdCB0d2Vlbkxlbmd0aCA9IHR3ZWVucy5sZW5ndGggLSAxO1xuICAgICAgICBsZXQgdHdlZW4gPSB0d2VlbnNbdHdlZW5MZW5ndGhdO1xuICAgICAgICAvLyBPbmx5IGNoZWNrIGZvciBrZXlmcmFtZXMgaWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSB0d2VlblxuICAgICAgICBpZiAodHdlZW5MZW5ndGgpIHR3ZWVuID0gZmlsdGVyQXJyYXkodHdlZW5zLCB0ID0+IChpbnNUaW1lIDwgdC5lbmQpKVswXSB8fCB0d2VlbjtcbiAgICAgICAgY29uc3QgZWxhcHNlZCA9IG1pbk1heFZhbHVlKGluc1RpbWUgLSB0d2Vlbi5zdGFydCAtIHR3ZWVuLmRlbGF5LCAwLCB0d2Vlbi5kdXJhdGlvbikgLyB0d2Vlbi5kdXJhdGlvbjtcbiAgICAgICAgY29uc3QgZWFzZWQgPSBpc05hTihlbGFwc2VkKSA/IDEgOiB0d2Vlbi5lYXNpbmcoZWxhcHNlZCwgdHdlZW4uZWxhc3RpY2l0eSk7XG4gICAgICAgIGNvbnN0IHN0cmluZ3MgPSB0d2Vlbi50by5zdHJpbmdzO1xuICAgICAgICBjb25zdCByb3VuZCA9IHR3ZWVuLnJvdW5kO1xuICAgICAgICBsZXQgbnVtYmVycyA9IFtdO1xuICAgICAgICBsZXQgcHJvZ3Jlc3M7XG4gICAgICAgIGNvbnN0IHRvTnVtYmVyc0xlbmd0aCA9IHR3ZWVuLnRvLm51bWJlcnMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IHRvTnVtYmVyc0xlbmd0aDsgbisrKSB7XG4gICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgIGNvbnN0IHRvTnVtYmVyID0gdHdlZW4udG8ubnVtYmVyc1tuXTtcbiAgICAgICAgICBjb25zdCBmcm9tTnVtYmVyID0gdHdlZW4uZnJvbS5udW1iZXJzW25dO1xuICAgICAgICAgIGlmICghdHdlZW4uaXNQYXRoKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGZyb21OdW1iZXIgKyAoZWFzZWQgKiAodG9OdW1iZXIgLSBmcm9tTnVtYmVyKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gZ2V0UGF0aFByb2dyZXNzKHR3ZWVuLnZhbHVlLCBlYXNlZCAqIHRvTnVtYmVyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJvdW5kKSB7XG4gICAgICAgICAgICBpZiAoISh0d2Vlbi5pc0NvbG9yICYmIG4gPiAyKSkge1xuICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGgucm91bmQodmFsdWUgKiByb3VuZCkgLyByb3VuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbnVtYmVycy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBNYW51YWwgQXJyYXkucmVkdWNlIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VzXG4gICAgICAgIGNvbnN0IHN0cmluZ3NMZW5ndGggPSBzdHJpbmdzLmxlbmd0aDtcbiAgICAgICAgaWYgKCFzdHJpbmdzTGVuZ3RoKSB7XG4gICAgICAgICAgcHJvZ3Jlc3MgPSBudW1iZXJzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2dyZXNzID0gc3RyaW5nc1swXTtcbiAgICAgICAgICBmb3IgKGxldCBzID0gMDsgcyA8IHN0cmluZ3NMZW5ndGg7IHMrKykge1xuICAgICAgICAgICAgY29uc3QgYSA9IHN0cmluZ3Nbc107XG4gICAgICAgICAgICBjb25zdCBiID0gc3RyaW5nc1tzICsgMV07XG4gICAgICAgICAgICBjb25zdCBuID0gbnVtYmVyc1tzXTtcbiAgICAgICAgICAgIGlmICghaXNOYU4obikpIHtcbiAgICAgICAgICAgICAgaWYgKCFiKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3MgKz0gbiArICcgJztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyArPSBuICsgYjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRUd2VlblByb2dyZXNzW2FuaW0udHlwZV0oYW5pbWF0YWJsZS50YXJnZXQsIGFuaW0ucHJvcGVydHksIHByb2dyZXNzLCB0cmFuc2Zvcm1zLCBhbmltYXRhYmxlLmlkKTtcbiAgICAgICAgYW5pbS5jdXJyZW50VmFsdWUgPSBwcm9ncmVzcztcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3Jtc0xlbmd0aCA9IE9iamVjdC5rZXlzKHRyYW5zZm9ybXMpLmxlbmd0aDtcbiAgICAgIGlmICh0cmFuc2Zvcm1zTGVuZ3RoKSB7XG4gICAgICAgIGZvciAobGV0IGlkID0gMDsgaWQgPCB0cmFuc2Zvcm1zTGVuZ3RoOyBpZCsrKSB7XG4gICAgICAgICAgaWYgKCF0cmFuc2Zvcm1TdHJpbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSAndHJhbnNmb3JtJztcbiAgICAgICAgICAgIHRyYW5zZm9ybVN0cmluZyA9IChnZXRDU1NWYWx1ZShkb2N1bWVudC5ib2R5LCB0KSA/IHQgOiBgLXdlYmtpdC0ke3R9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGluc3RhbmNlLmFuaW1hdGFibGVzW2lkXS50YXJnZXQuc3R5bGVbdHJhbnNmb3JtU3RyaW5nXSA9IHRyYW5zZm9ybXNbaWRdLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaW5zdGFuY2UuY3VycmVudFRpbWUgPSBpbnNUaW1lO1xuICAgICAgaW5zdGFuY2UucHJvZ3Jlc3MgPSAoaW5zVGltZSAvIGluc3RhbmNlLmR1cmF0aW9uKSAqIDEwMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRDYWxsYmFjayhjYikge1xuICAgICAgaWYgKGluc3RhbmNlW2NiXSkgaW5zdGFuY2VbY2JdKGluc3RhbmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb3VudEl0ZXJhdGlvbigpIHtcbiAgICAgIGlmIChpbnN0YW5jZS5yZW1haW5pbmcgJiYgaW5zdGFuY2UucmVtYWluaW5nICE9PSB0cnVlKSB7XG4gICAgICAgIGluc3RhbmNlLnJlbWFpbmluZy0tO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldEluc3RhbmNlUHJvZ3Jlc3MoZW5naW5lVGltZSkge1xuICAgICAgY29uc3QgaW5zRHVyYXRpb24gPSBpbnN0YW5jZS5kdXJhdGlvbjtcbiAgICAgIGNvbnN0IGluc09mZnNldCA9IGluc3RhbmNlLm9mZnNldDtcbiAgICAgIGNvbnN0IGluc1N0YXJ0ID0gaW5zT2Zmc2V0ICsgaW5zdGFuY2UuZGVsYXk7XG4gICAgICBjb25zdCBpbnNDdXJyZW50VGltZSA9IGluc3RhbmNlLmN1cnJlbnRUaW1lO1xuICAgICAgY29uc3QgaW5zUmV2ZXJzZWQgPSBpbnN0YW5jZS5yZXZlcnNlZDtcbiAgICAgIGNvbnN0IGluc1RpbWUgPSBhZGp1c3RUaW1lKGVuZ2luZVRpbWUpO1xuICAgICAgaWYgKGluc3RhbmNlLmNoaWxkcmVuLmxlbmd0aCkgc3luY0luc3RhbmNlQ2hpbGRyZW4oaW5zVGltZSk7XG4gICAgICBpZiAoaW5zVGltZSA+PSBpbnNTdGFydCB8fCAhaW5zRHVyYXRpb24pIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5iZWdhbikge1xuICAgICAgICAgIGluc3RhbmNlLmJlZ2FuID0gdHJ1ZTtcbiAgICAgICAgICBzZXRDYWxsYmFjaygnYmVnaW4nKTtcbiAgICAgICAgfVxuICAgICAgICBzZXRDYWxsYmFjaygncnVuJyk7XG4gICAgICB9XG4gICAgICBpZiAoaW5zVGltZSA+IGluc09mZnNldCAmJiBpbnNUaW1lIDwgaW5zRHVyYXRpb24pIHtcbiAgICAgICAgc2V0QW5pbWF0aW9uc1Byb2dyZXNzKGluc1RpbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGluc1RpbWUgPD0gaW5zT2Zmc2V0ICYmIGluc0N1cnJlbnRUaW1lICE9PSAwKSB7XG4gICAgICAgICAgc2V0QW5pbWF0aW9uc1Byb2dyZXNzKDApO1xuICAgICAgICAgIGlmIChpbnNSZXZlcnNlZCkgY291bnRJdGVyYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKGluc1RpbWUgPj0gaW5zRHVyYXRpb24gJiYgaW5zQ3VycmVudFRpbWUgIT09IGluc0R1cmF0aW9uKSB8fCAhaW5zRHVyYXRpb24pIHtcbiAgICAgICAgICBzZXRBbmltYXRpb25zUHJvZ3Jlc3MoaW5zRHVyYXRpb24pO1xuICAgICAgICAgIGlmICghaW5zUmV2ZXJzZWQpIGNvdW50SXRlcmF0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNldENhbGxiYWNrKCd1cGRhdGUnKTtcbiAgICAgIGlmIChlbmdpbmVUaW1lID49IGluc0R1cmF0aW9uKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5yZW1haW5pbmcpIHtcbiAgICAgICAgICBzdGFydFRpbWUgPSBub3c7XG4gICAgICAgICAgaWYgKGluc3RhbmNlLmRpcmVjdGlvbiA9PT0gJ2FsdGVybmF0ZScpIHRvZ2dsZUluc3RhbmNlRGlyZWN0aW9uKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaW5zdGFuY2UucGF1c2UoKTtcbiAgICAgICAgICBpZiAoIWluc3RhbmNlLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHNldENhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICAgICAgaWYgKCdQcm9taXNlJyBpbiB3aW5kb3cpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICBwcm9taXNlID0gbWFrZVByb21pc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGFzdFRpbWUgPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIGluc3RhbmNlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBkaXJlY3Rpb24gPSBpbnN0YW5jZS5kaXJlY3Rpb247XG4gICAgICBjb25zdCBsb29wcyA9IGluc3RhbmNlLmxvb3A7XG4gICAgICBpbnN0YW5jZS5jdXJyZW50VGltZSA9IDA7XG4gICAgICBpbnN0YW5jZS5wcm9ncmVzcyA9IDA7XG4gICAgICBpbnN0YW5jZS5wYXVzZWQgPSB0cnVlO1xuICAgICAgaW5zdGFuY2UuYmVnYW4gPSBmYWxzZTtcbiAgICAgIGluc3RhbmNlLmNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgaW5zdGFuY2UucmV2ZXJzZWQgPSBkaXJlY3Rpb24gPT09ICdyZXZlcnNlJztcbiAgICAgIGluc3RhbmNlLnJlbWFpbmluZyA9IGRpcmVjdGlvbiA9PT0gJ2FsdGVybmF0ZScgJiYgbG9vcHMgPT09IDEgPyAyIDogbG9vcHM7XG4gICAgICBzZXRBbmltYXRpb25zUHJvZ3Jlc3MoMCk7XG4gICAgICBmb3IgKGxldCBpID0gaW5zdGFuY2UuY2hpbGRyZW4ubGVuZ3RoOyBpLS07ICl7XG4gICAgICAgIGluc3RhbmNlLmNoaWxkcmVuW2ldLnJlc2V0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaW5zdGFuY2UudGljayA9IGZ1bmN0aW9uKHQpIHtcbiAgICAgIG5vdyA9IHQ7XG4gICAgICBpZiAoIXN0YXJ0VGltZSkgc3RhcnRUaW1lID0gbm93O1xuICAgICAgY29uc3QgZW5naW5lVGltZSA9IChsYXN0VGltZSArIG5vdyAtIHN0YXJ0VGltZSkgKiBhbmltZS5zcGVlZDtcbiAgICAgIHNldEluc3RhbmNlUHJvZ3Jlc3MoZW5naW5lVGltZSk7XG4gICAgfVxuXG4gICAgaW5zdGFuY2Uuc2VlayA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgICAgIHNldEluc3RhbmNlUHJvZ3Jlc3MoYWRqdXN0VGltZSh0aW1lKSk7XG4gICAgfVxuXG4gICAgaW5zdGFuY2UucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGkgPSBhY3RpdmVJbnN0YW5jZXMuaW5kZXhPZihpbnN0YW5jZSk7XG4gICAgICBpZiAoaSA+IC0xKSBhY3RpdmVJbnN0YW5jZXMuc3BsaWNlKGksIDEpO1xuICAgICAgaW5zdGFuY2UucGF1c2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZS5wbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWluc3RhbmNlLnBhdXNlZCkgcmV0dXJuO1xuICAgICAgaW5zdGFuY2UucGF1c2VkID0gZmFsc2U7XG4gICAgICBzdGFydFRpbWUgPSAwO1xuICAgICAgbGFzdFRpbWUgPSBhZGp1c3RUaW1lKGluc3RhbmNlLmN1cnJlbnRUaW1lKTtcbiAgICAgIGFjdGl2ZUluc3RhbmNlcy5wdXNoKGluc3RhbmNlKTtcbiAgICAgIGlmICghcmFmKSBlbmdpbmUoKTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZS5yZXZlcnNlID0gZnVuY3Rpb24oKSB7XG4gICAgICB0b2dnbGVJbnN0YW5jZURpcmVjdGlvbigpO1xuICAgICAgc3RhcnRUaW1lID0gMDtcbiAgICAgIGxhc3RUaW1lID0gYWRqdXN0VGltZShpbnN0YW5jZS5jdXJyZW50VGltZSk7XG4gICAgfVxuXG4gICAgaW5zdGFuY2UucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaW5zdGFuY2UucGF1c2UoKTtcbiAgICAgIGluc3RhbmNlLnJlc2V0KCk7XG4gICAgICBpbnN0YW5jZS5wbGF5KCk7XG4gICAgfVxuXG4gICAgaW5zdGFuY2UuZmluaXNoZWQgPSBwcm9taXNlO1xuXG4gICAgaW5zdGFuY2UucmVzZXQoKTtcblxuICAgIGlmIChpbnN0YW5jZS5hdXRvcGxheSkgaW5zdGFuY2UucGxheSgpO1xuXG4gICAgcmV0dXJuIGluc3RhbmNlO1xuXG4gIH1cblxuICAvLyBSZW1vdmUgdGFyZ2V0cyBmcm9tIGFuaW1hdGlvblxuXG4gIGZ1bmN0aW9uIHJlbW92ZVRhcmdldHModGFyZ2V0cykge1xuICAgIGNvbnN0IHRhcmdldHNBcnJheSA9IHBhcnNlVGFyZ2V0cyh0YXJnZXRzKTtcbiAgICBmb3IgKGxldCBpID0gYWN0aXZlSW5zdGFuY2VzLmxlbmd0aDsgaS0tOykge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBhY3RpdmVJbnN0YW5jZXNbaV07XG4gICAgICBjb25zdCBhbmltYXRpb25zID0gaW5zdGFuY2UuYW5pbWF0aW9ucztcbiAgICAgIGZvciAobGV0IGEgPSBhbmltYXRpb25zLmxlbmd0aDsgYS0tOykge1xuICAgICAgICBpZiAoYXJyYXlDb250YWlucyh0YXJnZXRzQXJyYXksIGFuaW1hdGlvbnNbYV0uYW5pbWF0YWJsZS50YXJnZXQpKSB7XG4gICAgICAgICAgYW5pbWF0aW9ucy5zcGxpY2UoYSwgMSk7XG4gICAgICAgICAgaWYgKCFhbmltYXRpb25zLmxlbmd0aCkgaW5zdGFuY2UucGF1c2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRpbWVsaW5lXG5cbiAgZnVuY3Rpb24gdGltZWxpbmUocGFyYW1zKSB7XG4gICAgbGV0IHRsID0gYW5pbWUocGFyYW1zKTtcbiAgICB0bC5wYXVzZSgpO1xuICAgIHRsLmR1cmF0aW9uID0gMDtcbiAgICB0bC5hZGQgPSBmdW5jdGlvbihpbnN0YW5jZXNQYXJhbXMpIHtcbiAgICAgIHRsLmNoaWxkcmVuLmZvckVhY2goaSA9PiB7IGkuYmVnYW4gPSB0cnVlOyBpLmNvbXBsZXRlZCA9IHRydWU7IH0pO1xuICAgICAgdG9BcnJheShpbnN0YW5jZXNQYXJhbXMpLmZvckVhY2goaW5zdGFuY2VQYXJhbXMgPT4ge1xuICAgICAgICBsZXQgaW5zUGFyYW1zID0gbWVyZ2VPYmplY3RzKGluc3RhbmNlUGFyYW1zLCByZXBsYWNlT2JqZWN0UHJvcHMoZGVmYXVsdFR3ZWVuU2V0dGluZ3MsIHBhcmFtcyB8fCB7fSkpO1xuICAgICAgICBpbnNQYXJhbXMudGFyZ2V0cyA9IGluc1BhcmFtcy50YXJnZXRzIHx8IHBhcmFtcy50YXJnZXRzO1xuICAgICAgICBjb25zdCB0bER1cmF0aW9uID0gdGwuZHVyYXRpb247XG4gICAgICAgIGNvbnN0IGluc09mZnNldCA9IGluc1BhcmFtcy5vZmZzZXQ7XG4gICAgICAgIGluc1BhcmFtcy5hdXRvcGxheSA9IGZhbHNlO1xuICAgICAgICBpbnNQYXJhbXMuZGlyZWN0aW9uID0gdGwuZGlyZWN0aW9uO1xuICAgICAgICBpbnNQYXJhbXMub2Zmc2V0ID0gaXMudW5kKGluc09mZnNldCkgPyB0bER1cmF0aW9uIDogZ2V0UmVsYXRpdmVWYWx1ZShpbnNPZmZzZXQsIHRsRHVyYXRpb24pO1xuICAgICAgICB0bC5iZWdhbiA9IHRydWU7XG4gICAgICAgIHRsLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIHRsLnNlZWsoaW5zUGFyYW1zLm9mZnNldCk7XG4gICAgICAgIGNvbnN0IGlucyA9IGFuaW1lKGluc1BhcmFtcyk7XG4gICAgICAgIGlucy5iZWdhbiA9IHRydWU7XG4gICAgICAgIGlucy5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoaW5zLmR1cmF0aW9uID4gdGxEdXJhdGlvbikgdGwuZHVyYXRpb24gPSBpbnMuZHVyYXRpb247XG4gICAgICAgIHRsLmNoaWxkcmVuLnB1c2goaW5zKTtcbiAgICAgIH0pO1xuICAgICAgdGwuc2VlaygwKTtcbiAgICAgIHRsLnJlc2V0KCk7XG4gICAgICBpZiAodGwuYXV0b3BsYXkpIHRsLnJlc3RhcnQoKTtcbiAgICAgIHJldHVybiB0bDtcbiAgICB9XG4gICAgcmV0dXJuIHRsO1xuICB9XG5cbiAgYW5pbWUudmVyc2lvbiA9ICcyLjIuMCc7XG4gIGFuaW1lLnNwZWVkID0gMTtcbiAgYW5pbWUucnVubmluZyA9IGFjdGl2ZUluc3RhbmNlcztcbiAgYW5pbWUucmVtb3ZlID0gcmVtb3ZlVGFyZ2V0cztcbiAgYW5pbWUuZ2V0VmFsdWUgPSBnZXRPcmlnaW5hbFRhcmdldFZhbHVlO1xuICBhbmltZS5wYXRoID0gZ2V0UGF0aDtcbiAgYW5pbWUuc2V0RGFzaG9mZnNldCA9IHNldERhc2hvZmZzZXQ7XG4gIGFuaW1lLmJlemllciA9IGJlemllcjtcbiAgYW5pbWUuZWFzaW5ncyA9IGVhc2luZ3M7XG4gIGFuaW1lLnRpbWVsaW5lID0gdGltZWxpbmU7XG4gIGFuaW1lLnJhbmRvbSA9IChtaW4sIG1heCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcblxuICByZXR1cm4gYW5pbWU7XG5cbn0pKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJnek5DZ0xcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9jb250cmliXFxcXGFuaW1lLmpzXCIsXCIvY29udHJpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbihmdW5jdGlvbiAoJCkge1xyXG4gIHZhciBhbmltID0gcmVxdWlyZSgnLi9jb250cmliL2FuaW1lLmpzJyk7XHJcbiAgdmFyIHNpdGVIZWFkZXIgPSAkKCcuc2l0ZS1oZWFkZXInKTtcclxuXHJcbiAgdmFyIHJlbW92ZUFuaW1FbGVtID0gZnVuY3Rpb24gKCkge1xyXG4gICAgYW5pbS5yZW1vdmUoc2l0ZUhlYWRlci5maW5kKCdpbWcnKVswXSk7XHJcbiAgICBhbmltLnJlbW92ZShzaXRlSGVhZGVyWzBdKTtcclxuICB9O1xyXG4gIHZhciBoZWFkZXJBbmltZVNjcm9sbCA9IGZ1bmN0aW9uIChzY3JvbGwpIHtcclxuICAgIHZhciBkdXJhdGlvbiA9IDUwMDtcclxuICAgIGlmIChzY3JvbGwgPiAyMCkge1xyXG5cclxuICAgICAgc2l0ZUhlYWRlci5maW5kKCdhJykuYWRkQ2xhc3MoJ2NvbG9yLWJsdWUnKTtcclxuICAgICAgc2l0ZUhlYWRlci5maW5kKCdhJykucmVtb3ZlQ2xhc3MoJ2NvbG9yLXdoaXRlJyk7XHJcbiAgICAgIHJlbW92ZUFuaW1FbGVtKCk7XHJcbiAgICAgIGFuaW0oe1xyXG4gICAgICAgIHRhcmdldHM6IHNpdGVIZWFkZXIuZmluZCgnLnNpdGUtaGVhZGVyLW1haW4nKVswXSxcclxuICAgICAgICBoZWlnaHQ6ICc2MHB4JyxcclxuICAgICAgICBkdXJhdGlvbjogZHVyYXRpb24sXHJcbiAgICAgICAgZWFzaW5nOiAnZWFzZUluUXVhZCcsXHJcbiAgICAgIH0pO1xyXG4gICAgICBhbmltKHtcclxuICAgICAgICB0YXJnZXRzOiBzaXRlSGVhZGVyWzBdLFxyXG4gICAgICAgIGJhY2tncm91bmRDb2xvcjogW1wiaHNsYSgwLCAwJSwgMTAwJSwxKVwiLCBcImhzbGEoMCwgMCUsIDEwMCUsMSlcIl0sXHJcbiAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uLFxyXG5cclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzaXRlSGVhZGVyLmZpbmQoJ2EnKS5hZGRDbGFzcygnY29sb3Itd2hpdGUnKTtcclxuICAgICAgc2l0ZUhlYWRlci5maW5kKCdhJykucmVtb3ZlQ2xhc3MoJ2NvbG9yLWJsdWUnKTtcclxuICAgICAgcmVtb3ZlQW5pbUVsZW0oKTtcclxuICAgICAgYW5pbSh7XHJcbiAgICAgICAgdGFyZ2V0czogc2l0ZUhlYWRlci5maW5kKCcuc2l0ZS1oZWFkZXItbWFpbicpWzBdLFxyXG4gICAgICAgIGhlaWdodDogJzgwcHgnLFxyXG4gICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvbixcclxuICAgICAgICBlYXNpbmc6ICdlYXNlSW5RdWFkJ1xyXG4gICAgICB9KTtcclxuICAgICAgYW5pbSh7XHJcbiAgICAgICAgdGFyZ2V0czogc2l0ZUhlYWRlclswXSxcclxuICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFtcImhzbGEoMCwgMCUsIDEwMCUsMClcIiwgXCJoc2xhKDAsIDAlLCAxMDAlLDApXCJdLFxyXG4gICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvbixcclxuICAgICAgICBlYXNpbmc6ICdlYXNlSW5RdWFkJ1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBpbml0SGVhZGVyU2Nyb2xsKCkge1xyXG4gICAgJCh3aW5kb3cpLnVuYmluZChcInNjcm9sbC5ldmVudFwiKTtcclxuICAgIGlmICgkKHdpbmRvdykuaW5uZXJXaWR0aCgpID4gNzY3KSB7XHJcbiAgICAgIHNpdGVIZWFkZXIuY3NzKCdiYWNrZ3JvdW5kJywndW5zZXQnKTtcclxuICAgICAgJCh3aW5kb3cpLm9uKCdzY3JvbGwuZXZlbnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnbGF1bmNoJyk7XHJcbiAgICAgICAgdmFyIHNjcm9sbCA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcclxuICAgICAgICBoZWFkZXJBbmltZVNjcm9sbChzY3JvbGwpO1xyXG4gICAgICB9KVxyXG4gICAgfWVsc2V7XHJcbiAgICAgIHNpdGVIZWFkZXIuY3NzKCdiYWNrZ3JvdW5kJywnd2hpdGUnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGluaXRIZWFkZXJTY3JvbGwoKTtcclxuICAkKHdpbmRvdykub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgIGluaXRIZWFkZXJTY3JvbGwoKTtcclxuICB9KVxyXG59KShqUXVlcnkpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJnek5DZ0xcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9mYWtlXzRlOTZmOWQ2LmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xudmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiZ3pOQ2dMXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi5cXFxcLi5cXFxcbm9kZV9tb2R1bGVzXFxcXGJhc2U2NC1qc1xcXFxsaWJcXFxcYjY0LmpzXCIsXCIvLi5cXFxcLi5cXFxcbm9kZV9tb2R1bGVzXFxcXGJhc2U2NC1qc1xcXFxsaWJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJnek5DZ0xcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcYnJvd3NlcmlmeVxcXFxub2RlX21vZHVsZXNcXFxccHJvY2Vzc1xcXFxicm93c2VyLmpzXCIsXCIvLi5cXFxcLi5cXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXHByb2Nlc3NcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcImd6TkNnTFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxidWZmZXJcXFxcaW5kZXguanNcIixcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcYnVmZmVyXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcImd6TkNnTFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxpZWVlNzU0XFxcXGluZGV4LmpzXCIsXCIvLi5cXFxcLi5cXFxcbm9kZV9tb2R1bGVzXFxcXGllZWU3NTRcIikiXX0=
