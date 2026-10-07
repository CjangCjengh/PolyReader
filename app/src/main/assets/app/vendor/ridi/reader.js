/*! RIDI Reader.js 1.0.61 | MIT | https://github.com/ridi/Reader.js */
var ReaderJS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // vendor-src/ridi/src/android/index.es6
  var index_exports = {};
  __export(index_exports, {
    Context: () => Context,
    Reader: () => Reader,
    TTS: () => TTS,
    TTSUtil: () => TTSUtil,
    TTSUtterance: () => TTSUtterance,
    Util: () => Util,
    default: () => index_default
  });

  // vendor-src/ridi/src/common/_Object.es6
  var _Object = class {
    /**
     * static은 오버라이딩할 수 없기 때문에 편법을 사용하여 구현.
     *
     * @param {class} from
     * @param {class} to
     * @param {function[]} methods
     */
    static staticOverride(from, to, methods) {
      const _to = to;
      methods.forEach((method) => {
        _to.prototype.constructor[method] = from.prototype.constructor[method];
      });
    }
  };

  // vendor-src/ridi/src/common/_Context.es6
  var _Context = class extends _Object {
    /**
     * @returns {Number}
     */
    get pageWidthUnit() {
      return this._width + this.pageGap;
    }
    /**
     * @returns {Number}
     */
    get pageHeightUnit() {
      return this._height;
    }
    /**
     * @returns {Number}
     */
    get pageGap() {
      return this._gap;
    }
    /**
     * @returns {Number}
     */
    get pageUnit() {
      return this.isScrollMode ? this.pageHeightUnit : this.pageWidthUnit;
    }
    /**
     * @returns {Number}
     */
    get nativeDenstiy() {
      return this._nativeDenstiy;
    }
    /**
     * @returns {Boolean}
     */
    get isDoublePageMode() {
      return this._doublePageMode;
    }
    /**
     * @returns {Boolean}
     */
    get isScrollMode() {
      return this._scrollMode;
    }
    /**
     * @returns {Number}
     */
    get systemMajorVersion() {
      return this._systemMajorVersion;
    }
    /**
     * @returns {Number}
     */
    get maxSelectionLength() {
      return this._maxSelectionLength;
    }
    /**
     * @param {Number} width
     * @param {Number} height
     * @param {Number} gap
     * @param {Number} nativeDenstiy
     * @param {Boolean} doublePageMode
     * @param {Boolean} scrollMode
     * @param {Number} maxSelectionLength
     * @param {Number} systemMajorVersion
     */
    constructor(width, height, gap, nativeDenstiy, doublePageMode, scrollMode, maxSelectionLength = 0, systemMajorVersion = 0) {
      super();
      this._width = width;
      this._height = height;
      this._gap = gap;
      this._nativeDenstiy = nativeDenstiy;
      this._doublePageMode = doublePageMode;
      this._scrollMode = scrollMode;
      this._maxSelectionLength = maxSelectionLength;
      this._systemMajorVersion = systemMajorVersion;
    }
  };

  // vendor-src/ridi/src/android/Context.es6
  var Context = class extends _Context {
    /**
     * @returns {Number}
     */
    get pageWidthUnit() {
      return (this._width + this.pageGap) * (this.isDoublePageMode ? 2 : 1);
    }
  };

  // vendor-src/ridi/src/common/_Util.es6
  var _Util = class __Util extends _Object {
    /**
     * @param {Node} node
     * @returns {NodeIterator}
     */
    static createTextNodeIterator(node) {
      return document.createNodeIterator(node, NodeFilter.SHOW_TEXT, {
        acceptNode() {
          return NodeFilter.FILTER_ACCEPT;
        }
      }, true);
    }
    /**
     * @returns {RegExp}
     */
    static getFootnoteRegex() {
      return /^(\[|\{|\(|주|)[0-9].*(\)|\}|\]|\.|)$/gm;
    }
    /**
     * @returns {RegExp}
     */
    static getSplitWordRegex() {
      return new RegExp(" |\\u00A0");
    }
    /**
     * @param {Node} imgEl
     * @returns {{dWidth: *, dHeight: *, nWidth: number, nHeight: number,
     * sWidth: *, sHeight: *, aWidth: string, aHeight: string}}
     */
    static getImageSize(imgEl) {
      const attrs = imgEl.attributes;
      const zeroAttr = document.createAttribute("size");
      zeroAttr.value = "0px";
      const nWidth = imgEl.naturalWidth;
      const nHeight = imgEl.naturalHeight;
      return {
        // 화면에 맞춰 랜더링된 크기
        // 브라우저 버전에 따라 0일 수 있는데 원본 크기로 대체한다
        dWidth: imgEl.width || nWidth,
        dHeight: imgEl.height || nHeight,
        // 원본 크기
        nWidth,
        nHeight,
        // CSS에서 명시된 크기
        sWidth: __Util.getMatchedCSSValue(imgEl, "width"),
        sHeight: __Util.getMatchedCSSValue(imgEl, "height"),
        // 엘리먼트 속성으로 명시된 크기
        aWidth: (attrs.width || zeroAttr).value,
        aHeight: (attrs.height || zeroAttr).value
      };
    }
    /**
     * @param {Node} target
     * @param {String} property
     * @returns {Number}
     */
    static getStylePropertyIntValue(target, property) {
      let style = target;
      if (target.nodeType) {
        style = window.getComputedStyle(target);
      }
      return parseInt(style[property], 10) || 0;
    }
    /**
     * @param {Node} target
     * @param {String[]} properties
     * @returns {Number}
     */
    static getStylePropertiesIntValue(target, properties) {
      let style = target;
      if (target.nodeType) {
        style = window.getComputedStyle(target);
      }
      let value = 0;
      for (let i = 0; i < properties.length; i += 1) {
        value += parseInt(style[properties[i]], 10) || 0;
      }
      return value;
    }
    /**
     * @param {Node} el
     * @param {String} property
     * @returns {String}
     * @private
     */
    static _getMatchedCSSValue(el, property) {
      let val = el.style.getPropertyValue(property);
      if (el.style.getPropertyPriority(property)) {
        return val;
      }
      let rules;
      try {
        rules = window.getMatchedCSSRules(el);
        if (rules === null) {
          return val;
        }
      } catch (e) {
        return val;
      }
      for (let i = rules.length - 1; i >= 0; i -= 1) {
        const rule = rules[i];
        const important = rule.style.getPropertyPriority(property);
        if (val === null || val.length === 0 || important) {
          val = rule.style.getPropertyValue(property);
          if (important) {
            break;
          }
        }
      }
      return val;
    }
    /**
     * @param {Node} el
     * @param {String} property
     * @param {Boolean} recursive
     * @returns {String|null}
     */
    static getMatchedCSSValue(el, property, recursive = false) {
      let val;
      let target = el;
      while (!(val = this._getMatchedCSSValue(target, property))) {
        target = target.parentElement;
        if (target === null || !recursive) {
          break;
        }
      }
      return val;
    }
    /**
     * @param {MutableClientRect[]} array
     * @param {MutableClientRect[]} rects
     * @param {function} adjust
     * @returns {MutableClientRect[]}
     */
    static concatArray(array, rects, adjust = (rect) => rect) {
      for (let i = 0; i < rects.length; i += 1) {
        array.push(adjust(rects[i]));
      }
      return array;
    }
  };

  // vendor-src/ridi/src/common/tts/TTSUtil.es6
  var TTSUtil = class {
    /**
     * @param {TTSPiece[]} list
     * @param {function} callback
     * @returns {TTSPiece|null}
     */
    static find(list, callback) {
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i];
        if (callback(item)) {
          return item;
        }
      }
      return null;
    }
    /**
     * @param {String} prefix
     * @param {String} pattern
     * @param {String} suffix
     * @param {String} flags
     * @returns {RegExp}
     * @private
     */
    static _createRegex(prefix, pattern, suffix, flags) {
      return new RegExp(`${prefix || ""}${pattern || ""}${suffix || ""}`, flags || "gm");
    }
    /**
     * @returns {RegExp}
     */
    static getSplitWordRegex() {
      return _Util.getSplitWordRegex();
    }
    /**
     * @param {String} prefix
     * @param {String} suffix
     * @param {String} flags
     * @returns {RegExp}
     */
    static getWhitespaceRegex(prefix, suffix, flags) {
      return this._createRegex(prefix, "[ \\u00A0]", suffix, flags);
    }
    /**
     * @param {String} prefix
     * @param {String} suffix
     * @param {String} flags
     * @returns {RegExp}
     */
    static getNewLineRegex(prefix, suffix, flags) {
      return this._createRegex(prefix, "[\\r\\n]", suffix, flags);
    }
    /**
     * @param {String} prefix
     * @param {String} suffix
     * @param {String} flags
     * @returns {RegExp}
     */
    static getWhitespaceAndNewLineRegex(prefix, suffix, flags) {
      return this._createRegex(prefix, "[\\t\\r\\n\\s\\u00A0]", suffix, flags);
    }
    /**
     * @param {String} prefix
     * @param {String} suffix
     * @param {String} flags
     * @returns {RegExp}
     */
    static getSentenceRegex(prefix, suffix, flags) {
      return this._createRegex(prefix, `[.\u3002?!"\u201D'\u2019\u300D\u300F\u301E\u301F]`, suffix, flags);
    }
    // *** Char ***
    /**
     * @param {String} ch
     * @returns {Boolean}
     */
    static isLastCharOfSentence(ch = "") {
      return ch.match(this.getSentenceRegex()) !== null;
    }
    /**
     * @param {String} ch
     * @returns {Boolean}
     */
    static isDigitOrLatin(ch = "") {
      const code = ch.charCodeAt(0);
      return this.isLatinCharCode(code) || this.isDigitCharCode(code);
    }
    /**
     * '.'이 소수점 또는 영문이름을 위해 사용될 경우 true
     *
     * @param {String} textWithPeriod
     * @param {String} textAfterPeriod
     * @returns {Boolean}
     */
    static isPeriodPointOrName(textWithPeriod, textAfterPeriod) {
      if (textWithPeriod === void 0 || textAfterPeriod === void 0) {
        return false;
      }
      let hit = 0;
      let index = textWithPeriod.search(/[.](\s{0,})$/gm);
      if (index > 0 && this.isDigitOrLatin(textWithPeriod[index - 1])) {
        hit += 1;
      }
      index = textAfterPeriod.search(/[^\s]/gm);
      if (index >= 0 && this.isDigitOrLatin(textAfterPeriod[index])) {
        hit += 1;
      }
      return hit === 2;
    }
    // *** Bracket ***
    /**
     * @param {String} text
     * @returns {String}
     */
    static getBrackets(text = "") {
      try {
        return text.match(/[\(\)\{\}\[\]]/gm) || [];
      } catch (e) {
        return [];
      }
    }
    /**
     * @param {String} open
     * @param {String} close
     * @returns {Boolean}
     */
    static isOnePairBracket(open = "", close = "") {
      return (open + close).match(/\(\)|\{\}|\[\]/gm) !== null;
    }
    /**
     * @param {String[]} sentences
     * @returns {String[]}
     */
    static mergeSentencesWithinBrackets(sentences = []) {
      const resultSentences = [];
      const brackets = [];
      sentences.forEach((sentence) => {
        const didBracketsExist = brackets.length > 0;
        const newBrackets = this.getBrackets(sentence);
        newBrackets.forEach((newBracket) => {
          const lastBracket = brackets.pop();
          if (lastBracket) {
            if (!this.isOnePairBracket(lastBracket, newBracket)) {
              brackets.push(lastBracket);
              brackets.push(newBracket);
            }
          } else {
            brackets.push(newBracket);
          }
        });
        resultSentences.push((didBracketsExist ? resultSentences.pop() : "") + sentence);
      });
      if (brackets.length > 0) {
        console.error("Brackets does not match.");
        console.error({ sentences, brackets, resultSentences });
      }
      return resultSentences;
    }
    // *** CharCode ***
    /**
     * @param {Number} code
     * @param {Number[]} table
     * @returns {Boolean}
     * @private
     */
    static _containCharCode(code, table) {
      if (!isNaN(code)) {
        for (let i = 0; i < table.length; i += 2) {
          if (table[i] <= code && code <= table[i + 1]) {
            return true;
          }
        }
      }
      return false;
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isDigitCharCode(code) {
      return this._containCharCode(code, [48, 57]);
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isSpaceCharCode(code) {
      return code === 32 || code === 160;
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isTildeCharCode(code) {
      return code === 126 || code === 8764 || code === 12316;
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isColonCharCode(code) {
      return code === 58;
    }
    /**
     * @returns {Number[]}
     */
    static hangulCodeTable() {
      return [
        44032,
        55215
      ];
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isHangulCharCode(code) {
      return this._containCharCode(code, this.hangulCodeTable());
    }
    /**
     * @returns {Number[]}
     */
    static latinCodeTable() {
      return [
        32,
        127,
        // Latin Basic
        160,
        255,
        // Latin Supplement
        256,
        383,
        // Latin Extended-A
        384,
        591
        // Latin Extended-B
      ];
    }
    /**
     * @param {Number} code
     * @param {String} flag
     * @returns {Boolean}
     */
    static isLatinCharCode(code, flag) {
      if (isNaN(code)) {
        return false;
      }
      if (code >= 256 && code <= 383) {
        if (flag === "u") {
          if (code >= 256 && code <= 311 && code % 2 === 0 || code >= 330 && code <= 375 && code % 2 === 0 || code >= 313 && code <= 328 && code % 2 === 1 || code >= 377 && code <= 382 && code % 2 === 1) {
            return true;
          } else if (code === 376) {
            return true;
          }
        } else if (flag === "l") {
          if (code >= 256 && code <= 311 && code % 2 === 1 || code >= 330 && code <= 375 && code % 2 === 1 || code >= 313 && code <= 328 && code % 2 === 0 || code >= 377 && code <= 382 && code % 2 === 0) {
            return true;
          } else if (code === 312 || code === 329 || code === 383) {
            return true;
          }
        }
        return false;
      } else if (code >= 384 && code <= 591) {
        return true;
      }
      const uppercaseTable = [65, 90, 192, 214, 216, 222];
      const lowercaseTable = [97, 122, 223, 246, 248, 255];
      let table;
      if (flag === "u") {
        table = uppercaseTable;
      } else if (flag === "l") {
        table = lowercaseTable;
      } else {
        table = [].concat(uppercaseTable).concat(lowercaseTable);
      }
      return this._containCharCode(code, table);
    }
    /**
     * @returns {Number[]}
     */
    static chineseCodeTable() {
      return [
        19968,
        40959,
        // CJK Unified Ideographs
        63744,
        64255,
        // CJK Compatibility Ideographs
        13056,
        13311,
        // CJK Compatibility
        13312,
        19903,
        // CJK Unified Ideographs Extension A
        131072,
        173791,
        // CJK Unified Ideographs Extension B
        173824,
        177983,
        // CJK Unified Ideographs Extension C
        177984,
        178207,
        // CJK Unified Ideographs Extension D
        178208,
        183983,
        // CJK Unified Ideographs Extension E
        183984,
        191471,
        // CJK Unified Ideographs Extension F
        194560,
        195103
        // CJK Compatibility Ideographs Supplement
      ];
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isChineseCharCode(code) {
      return this._containCharCode(code, this.chineseCodeTable());
    }
    /**
     * @returns {Number[]}
     */
    static japaneseCodeTable() {
      return [
        12288,
        12351,
        // Japanese-style punctuation
        12352,
        12447,
        // Hiragana
        12448,
        12543,
        // Katakana
        65280,
        65519,
        // Full-width roman characters and half-width katakana
        19968,
        40959
        // CJK Unified Ideographs
      ];
    }
    /**
     * @param {Number} code
     * @returns {Boolean}
     */
    static isJapaneseCharCode(code) {
      return this._containCharCode(code, this.japaneseCodeTable());
    }
    /**
     * @param {Number[]} tables
     * @returns {RegExp}
     */
    static getContainCharRegex(tables = []) {
      const toUnicode = (num) => {
        if (num > 65535) {
          return null;
        }
        return String.fromCharCode(num);
      };
      let string = "[";
      tables.forEach((table) => {
        for (let i = 0; i < table.length; i += 2) {
          const lower = toUnicode(table[i]);
          const upper = toUnicode(table[i + 1]);
          if (lower && upper) {
            string += `${lower}-${upper}`;
          }
        }
      });
      string += "]";
      return new RegExp(`^${string}{1,}$`, "gm");
    }
    // Hangel
    /**
     * @param {Number} code
     * @returns {Number}
     */
    static getInitialCharCode(code) {
      const codes = [
        49,
        50,
        52,
        55,
        56,
        57,
        65,
        66,
        67,
        70,
        71,
        72,
        73,
        74,
        75,
        76,
        77,
        78
      ];
      return 12544 + codes[(code - 44032 - (code - 44032) % 28) / 28 / 21];
    }
    /**
     * @param {Number} code
     * @returns {Number}
     */
    static getMedialCharCodeIndex(code) {
      return (code - 44032 - (code - 44032) % 28) / 28 % 21;
    }
    /**
     * @param {Number} code
     * @returns {Number}
     */
    static getMedialCharCode(code) {
      const codes = [
        79,
        80,
        81,
        82,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        91,
        92,
        93,
        94,
        95,
        96,
        97,
        98,
        99
      ];
      const index = this.getMedialCharCodeIndex(code);
      return 12544 + codes[index];
    }
    /**
     * @param {Number} code
     * @returns {Number}
     */
    static getFinalCharCode(code) {
      const codes = [
        0,
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        64,
        65,
        66,
        68,
        69,
        70,
        71,
        72,
        74,
        75,
        76,
        77,
        78
      ];
      const index = (code - 44032) % 28;
      return (index === 0 ? 0 : 12544) + codes[index];
    }
    // *** Numeric ***
    /**
     * 기(양)수사 : 수량을 쓸 때 쓰는 수사
     *
     * @param {Number} num
     * @param {Boolean} isHangul
     * @returns {String}
     */
    static numericToNotationString(num, isHangul = true) {
      let ones;
      let tens;
      let teens;
      if (isHangul) {
        ones = ["", "\uC77C", "\uC774", "\uC0BC", "\uC0AC", "\uC624", "\uC721", "\uCE60", "\uD314", "\uAD6C"];
        tens = ["", "\uC77C", "\uC774", "\uC0BC", "\uC0AC", "\uC624", "\uC721", "\uCE60", "\uD314", "\uAD6C"];
        teens = ["\uC2ED", "\uC77C", "\uC774", "\uC0BC", "\uC0AC", "\uC624", "\uC721", "\uCE60", "\uD314", "\uAD6C"];
      } else {
        ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
        tens = [
          "",
          "",
          "twenty",
          "thirty",
          "forty",
          "fifty",
          "sixty",
          "seventy",
          "eighty",
          "ninety"
        ];
        teens = [
          "ten",
          "eleven",
          "twelve",
          "thirteen",
          "fourteen",
          "fifteen",
          "sixteen",
          "seventeen",
          "eighteen",
          "nineteen"
        ];
      }
      const convertTens = (_num) => {
        if (_num < 10) {
          return ones[_num];
        } else if (!isHangul && _num >= 10 && _num < 20) {
          return teens[_num - 10];
        }
        if (isHangul && _num < 10 * 2) {
          return `\uC2ED${ones[_num % 10]}`;
        }
        const unit = isHangul ? "\uC2ED" : " ";
        return `${tens[Math.floor(_num / 10)]}${unit}${ones[_num % 10]}`;
      };
      const convertHundreds = (_num) => {
        if (_num > 99) {
          if (isHangul && _num < 100 * 2) {
            return `\uBC31${convertTens(_num % 100)}`;
          }
          const unit = isHangul ? "\uBC31" : " hundred ";
          return `${ones[Math.floor(_num / 100)]}${unit}${convertTens([_num % 100])}`;
        }
        return convertTens(_num);
      };
      const convertThousands = (_num) => {
        if (_num >= 1e3) {
          if (isHangul && _num < 1e3 * 2) {
            return `\uCC9C${convertHundreds(_num % 1e3)}`;
          }
          const unit = isHangul ? "\uCC9C" : " thousand ";
          return `${convertThousands(Math.floor(_num / 1e3))}${unit}${convertHundreds([_num % 1e3])}`;
        }
        return convertHundreds(_num);
      };
      const convertMillions = (_num) => {
        const base = isHangul ? 1e4 : 1e6;
        if (_num >= base) {
          if (isHangul && _num < base * 2) {
            return `\uB9CC${convertThousands(_num % base)}`;
          }
          const unit = isHangul ? "\uB9CC" : " million ";
          return `${convertMillions(Math.floor(_num / base))}${unit}${convertThousands([_num % base])}`;
        }
        return convertThousands(_num);
      };
      if (num === 0) {
        return isHangul ? "\uC601" : "zero";
      }
      return convertMillions(num).trim();
    }
    /**
     * 서수사 : 순서를 나타내는 수사(영문은 지원 안함)
     *
     * @param {Number} num
     * @param {String} suffix
     * @returns {String|null}
     */
    static numericToOrdinalString(num, suffix = "") {
      const ones = ["", "\uD55C", "\uB450", "\uC138", "\uB124", "\uB2E4\uC12F", "\uC5EC\uC12F", "\uC77C\uACF1", "\uC5EC\uB35F", "\uC544\uD649"];
      const tens = ["", "\uD558\uB098", "\uB458", "\uC14B", "\uB137", "\uB2E4\uC12F", "\uC5EC\uC12F", "\uC77C\uACF1", "\uC5EC\uB35F", "\uC544\uD649"];
      const teens = ["", "\uC5F4", "\uC2A4\uBB3C", "\uC11C\uB978", "\uB9C8\uD754", "\uC270", "\uC608\uC21C", "\uC77C\uD754", "\uC5EC\uB4E0", "\uC544\uD754"];
      const c = suffix.match(/^(명|공|달|시|종|벌|채|갈|쾌|근|문|큰|살|째)(?!러)/gm) !== null;
      if (!c && suffix.length) {
        return null;
      }
      const convertTens = (_num) => {
        if (_num < 10) {
          return ones[_num];
        }
        const unit = c ? ones[_num % 10] : tens[_num % 10];
        return `${teens[Math.floor(_num / 10)]}${unit}`;
      };
      const convertHundreds = (_num) => {
        if (_num > 99) {
          if (_num < 100 * 2) {
            return `\uBC31${convertTens(_num % 100)}`;
          }
          return `${this.numericToNotationString(Math.floor(_num / 100))}\uBC31${convertTens(_num % 100)}`;
        }
        return convertTens(_num);
      };
      const convertThousands = (_num) => {
        if (_num >= 1e3) {
          if (_num < 1e3 * 2) {
            return `\uCC9C${convertHundreds(_num % 1e3)}`;
          }
          return `${this.numericToNotationString(Math.floor(_num / 1e3))}\uCC9C${convertHundreds(_num % 1e3)}`;
        }
        return convertHundreds(_num);
      };
      const convertMillions = (_num) => {
        if (_num >= 1e4) {
          if (_num < 1e4 * 2) {
            return `\uB9CC${convertThousands(_num % 1e4)}`;
          }
          return `${this.numericToNotationString(Math.floor(_num / 1e4))}\uB9CC${convertThousands(_num % 1e4)}`;
        }
        return convertThousands(_num);
      };
      if (num === 0) {
        return null;
      }
      return convertMillions(num);
    }
  };

  // vendor-src/ridi/src/common/_Sel.es6
  var _Sel = class __Sel extends _Object {
    /**
     * @returns {Reader}
     */
    get reader() {
      return this._reader;
    }
    /**
     * @returns {Boolean}
     */
    get nextPageContinuable() {
      return this._checkNextPageContinuable(this.getSelectedRange());
    }
    /**
     * @param {Reader} reader
     */
    constructor(reader) {
      super();
      this._reader = reader;
      this._maxLength = reader.context.maxSelectionLength;
      this._startContainer = null;
      this._startOffset = null;
      this._endContainer = null;
      this._endOffset = null;
      this._overflowed = false;
      this._nextPageContinuable = false;
      this._continueContainer = null;
      this._continueOffset = null;
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {String} unit (character or word)
     * @param {Boolean} allowCollapsed
     * @returns {TextRange|null}
     * @private
     */
    _caretRangeFromPoint(x, y, unit = "word", allowCollapsed = false) {
      const point = this.reader.adjustPoint(x, y);
      const range = document.caretRangeFromPoint(point.x, point.y);
      if (range === null) {
        return null;
      }
      range.expand(unit);
      if (!allowCollapsed && range.collapsed) {
        return null;
      }
      return range;
    }
    /**
     * @param {Range} range
     * @private
     */
    _expandRangeByWord(range) {
      const { startContainer } = range;
      if (startContainer.nodeValue === null) {
        return;
      }
      const tables = [TTSUtil.chineseCodeTable(), TTSUtil.japaneseCodeTable()];
      if (TTSUtil.getContainCharRegex(tables).test(range.toString())) {
        range.expand("character");
        return;
      }
      const containerValueLength = startContainer.nodeValue.length;
      let start = range.startOffset;
      let origin = start;
      while (start > 0) {
        if (/^\s/.test(range.toString())) {
          range.setStart(startContainer, start += 1);
          break;
        }
        start -= 1;
        range.setStart(startContainer, start);
      }
      while (origin < containerValueLength) {
        if (/\s$/.test(range.toString())) {
          range.setEnd(startContainer, origin -= 1);
          break;
        }
        origin += 1;
        range.setEnd(startContainer, origin);
      }
    }
    /**
     * @param {Range} range
     * @returns {Boolean}
     */
    isOutOfBounds() {
      return false;
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {String} unit (character or word)
     * @returns {Boolean}
     */
    startSelectionMode(x, y, unit) {
      const range = this._caretRangeFromPoint(x, y, unit);
      if (range === null) {
        return false;
      }
      this._expandRangeByWord(range);
      if (!range.toString().length) {
        return false;
      }
      this._startContainer = range.startContainer;
      this._startOffset = range.startOffset;
      this._endContainer = range.endContainer;
      this._endOffset = range.endOffset;
      return true;
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {String} unit (character or word)
     * @returns {Boolean}
     */
    changeInitialSelection(x, y, unit) {
      const range = this._caretRangeFromPoint(x, y, unit);
      if (range === null) {
        return false;
      }
      this._startContainer = range.startContainer;
      this._startOffset = range.startOffset;
      this._endContainer = range.endContainer;
      this._endOffset = range.endOffset;
      return true;
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {String} unit (character or word)
     * @returns {Boolean}
     */
    expandUpperSelection(x, y, unit = "character") {
      const exRange = this._caretRangeFromPoint(x, y, unit, true);
      if (exRange === null) {
        return false;
      }
      const containerDiff = this._endContainer.compareDocumentPosition(exRange.startContainer);
      if (containerDiff === Node.DOCUMENT_POSITION_FOLLOWING || containerDiff === 0 && this._endOffset < exRange.startOffset) {
        return false;
      }
      if (exRange.startContainer === this._startContainer && exRange.startOffset === this._startOffset) {
        return false;
      }
      if (exRange.startContainer.childNodes.length) {
        exRange.setStart(exRange.startContainer.childNodes[exRange.startOffset], 0);
      }
      if (exRange.endContainer.childNodes.length) {
        exRange.setEnd(
          exRange.endContainer.childNodes[exRange.endOffset],
          exRange.endContainer.childNodes[exRange.endOffset].textContent.length
        );
      }
      const range = document.createRange();
      range.setStart(exRange.startContainer, exRange.startOffset);
      range.setEnd(this._endContainer, this._endOffset);
      if (range.collapsed) {
        return false;
      }
      if (!this.validLength(range)) {
        return false;
      }
      this._startContainer = exRange.startContainer;
      this._startOffset = exRange.startOffset;
      return true;
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {String} unit (character or word)
     * @returns {Boolean}
     */
    expandLowerSelection(x, y, unit = "character") {
      const exRange = this._caretRangeFromPoint(x, y, unit, true);
      if (exRange === null) {
        return false;
      }
      const containerDiff = this._startContainer.compareDocumentPosition(exRange.endContainer);
      if (containerDiff === Node.DOCUMENT_POSITION_PRECEDING || containerDiff === 0 && this._startOffset > exRange.endOffset) {
        return false;
      }
      if (exRange.endContainer === this._endContainer && exRange.endOffset === this._endOffset) {
        return false;
      }
      if (exRange.startContainer.childNodes.length) {
        exRange.setStart(exRange.startContainer.childNodes[exRange.startOffset], 0);
      }
      if (exRange.endContainer.childNodes.length) {
        exRange.setEnd(
          exRange.endContainer.childNodes[exRange.endOffset],
          exRange.endContainer.childNodes[exRange.endOffset].textContent.length
        );
      }
      if (this.isOutOfBounds(exRange)) {
        return false;
      }
      const range = document.createRange();
      range.setStart(this._startContainer, this._startOffset);
      range.setEnd(exRange.endContainer, exRange.endOffset);
      if (range.collapsed) {
        return false;
      }
      if (!this.validLength(range)) {
        return false;
      }
      this._endContainer = exRange.endContainer;
      this._endOffset = exRange.endOffset;
      return true;
    }
    /**
     * @param {Range} range
     * @returns {Number}
     * @private
     */
    _clientLeftOfRangeForCheckingNextPageContinuable(range) {
      const rect = range.getAdjustedBoundingClientRect();
      return Math.floor(rect.left + rect.width);
    }
    /**
     * @param {Range} range
     * @returns {Boolean}
     * @private
     */
    _checkNextPageContinuable(range) {
      if (!this.reader.context.isScrollMode) {
        const upperBound = this.getUpperBound();
        const clonedRange = range.cloneRange();
        let node = clonedRange.endContainer;
        let end = clonedRange.endOffset;
        do {
          const { length } = node.textContent;
          while (length > end) {
            clonedRange.setStart(node, end);
            clonedRange.setEnd(node, end + 1);
            if (/\s/.test(clonedRange.toString())) {
              end += 1;
            } else if (this._clientLeftOfRangeForCheckingNextPageContinuable(clonedRange) < upperBound) {
              this._nextPageContinuable = false;
              return this._nextPageContinuable;
            } else {
              this._expandRangeBySentenceInPage(clonedRange, upperBound * 2);
              this._continueContainer = clonedRange.endContainer;
              this._continueOffset = clonedRange.endOffset;
              this._nextPageContinuable = true;
              return this._nextPageContinuable;
            }
          }
          end = 0;
          this._nextPageContinuable = false;
        } while (node = this._getNextTextNode(clonedRange));
      }
      return this._nextPageContinuable;
    }
    /**
     * @param {Range} range
     * @param {Number} upperBound
     * @private
     */
    _expandRangeBySentenceInPage(range, upperBound) {
      const origin = range.endOffset;
      range.expand("sentence");
      let end = range.endOffset;
      while (end > origin) {
        if (/\s$/.test(range.toString())) {
          range.setEnd(range.endContainer, end -= 1);
        } else if (range.getAdjustedBoundingClientRect().right <= upperBound) {
          break;
        } else {
          range.setEnd(range.endContainer, end -= 1);
        }
      }
    }
    /**
     * @param {Range} range
     * @returns {Node|null}
     * @private
     */
    _getNextTextNode(range) {
      const node = range.endContainer;
      const nextNode = node.nextSibling;
      if (nextNode) {
        if (nextNode.nodeType === Node.TEXT_NODE) {
          return nextNode;
        }
        const textNode = _Util.createTextNodeIterator(nextNode).nextNode();
        if (textNode) {
          return textNode;
        }
        range.setEnd(nextNode, 0);
        return this._getNextTextNode(range);
      }
      range.setEndAfter(range.endContainer);
      if (range.endContainer.nodeName === "BODY") {
        return null;
      }
      return this._getNextTextNode(range);
    }
    /**
     * @returns {Boolean}
     */
    expandSelectionIntoNextPage() {
      if (!this._nextPageContinuable) {
        return false;
      }
      this._endContainer = this._continueContainer;
      this._endOffset = this._continueOffset;
      this._nextPageContinuable = false;
      return true;
    }
    /**
     * @param {Range} range
     * @returns {Boolean}
     */
    validLength(range) {
      if (!(range.toString().length <= this._maxLength)) {
        if (!this._overflowed) {
          _Util.toast(`\uCD5C\uB300 ${this._maxLength}\uC790\uAE4C\uC9C0 \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
        }
        this._overflowed = true;
        return false;
      }
      return true;
    }
    /**
     * @returns {Range}
     */
    getSelectedRange() {
      const range = document.createRange();
      range.setStart(this._startContainer, this._startOffset);
      range.setEnd(this._endContainer, this._endOffset);
      return range;
    }
    /**
     * @param {Content} content
     * @returns {String}
     */
    getSelectedSerializedRange() {
      return rangy.serializeRange(this.getSelectedRange(), true, this.reader.content.body);
    }
    /**
     * @returns {MutableClientRect[]}
     */
    getSelectedRangeRects() {
      return __Sel.getOnlyTextNodeRectsFromRange(this.getSelectedRange());
    }
    /**
     * @returns {String}
     */
    getSelectedText() {
      return this.getSelectedRange().toString();
    }
    /**
     * @returns {String}
     */
    getSelectedRectsCoord() {
      const rects = this.getSelectedRangeRects();
      if (rects.length) {
        this._overflowed = false;
        return this.reader.rectsToAbsoluteCoord(rects);
      }
      return "";
    }
    /**
     * @param {Range} range
     * @returns {Boolean}
     * @private
     */
    static _isWhiteSpaceRange(range) {
      return /^\s*$/.test(range.toString());
    }
    /**
     * @param {Range} range
     * @returns {MutableClientRect[]}
     */
    static getOnlyTextNodeRectsFromRange(range) {
      if (range.startContainer === range.endContainer) {
        const { innerText } = range.startContainer;
        if (innerText !== void 0 && innerText.length === 0) {
          return [];
        }
        return range.getAdjustedClientRects();
      }
      const iterator = _Util.createTextNodeIterator(range.commonAncestorContainer);
      let textNodeRects = [];
      let workRange = document.createRange();
      workRange.setStart(range.startContainer, range.startOffset);
      workRange.setEnd(range.startContainer, range.startContainer.length);
      textNodeRects = _Util.concatArray(textNodeRects, workRange.getAdjustedClientRects());
      let node;
      while (node = iterator.nextNode()) {
        if (range.startContainer.compareDocumentPosition(node) === Node.DOCUMENT_POSITION_PRECEDING || range.startContainer === node) {
          continue;
        }
        if (range.endContainer.compareDocumentPosition(node) === Node.DOCUMENT_POSITION_FOLLOWING || range.endContainer === node) {
          break;
        }
        workRange = document.createRange();
        workRange.selectNodeContents(node);
        if (this._isWhiteSpaceRange(workRange)) {
          continue;
        }
        textNodeRects = _Util.concatArray(textNodeRects, workRange.getAdjustedClientRects());
      }
      workRange = document.createRange();
      workRange.setStart(range.endContainer, 0);
      workRange.setEnd(range.endContainer, range.endOffset);
      if (!this._isWhiteSpaceRange(workRange)) {
        textNodeRects = _Util.concatArray(textNodeRects, workRange.getAdjustedClientRects());
      }
      return textNodeRects;
    }
  };

  // vendor-src/ridi/src/common/MutableClientRect.es6
  var MutableClientRect = class {
    get isEmpty() {
      return this.left === 0 && this.top === 0 && this.right === 0 && this.bottom === 0;
    }
    /**
     * @param {ClientRect} rect
     */
    constructor(rect) {
      if (rect) {
        this.left = rect.left || 0;
        this.top = rect.top || 0;
        this.right = rect.right || 0;
        this.bottom = rect.bottom || 0;
        this.width = rect.width || 0;
        this.height = rect.height || 0;
      } else {
        this.left = 0;
        this.top = 0;
        this.right = 0;
        this.bottom = 0;
        this.width = 0;
        this.height = 0;
      }
    }
  };

  // vendor-src/ridi/src/common/_Reader.es6
  var _Reader = class extends _Object {
    /**
     * @returns {Content}
     */
    get content() {
      return this._content;
    }
    /**
     * @returns {Handler}
     */
    get handler() {
      return this._handler;
    }
    /**
     * @returns {Sel}
     */
    get sel() {
      return this._sel;
    }
    /**
     * @returns {Context}
     */
    get context() {
      return this._context;
    }
    /**
     * @returns {Number}
     */
    get totalWidth() {
      return this.content.wrapper.scrollWidth;
    }
    /**
     * @returns {Number}
     */
    get totalHeight() {
      return this.content.wrapper.scrollHeight;
    }
    /**
     * @returns {Number}
     */
    get totalSize() {
      return this.context.isScrollMode ? this.totalHeight : this.totalWidth;
    }
    /**
     * @returns {Number}
     */
    get pageXOffset() {
      return window.pageXOffset;
    }
    /**
     * @returns {Number}
     */
    get pageYOffset() {
      return window.pageYOffset;
    }
    /**
     * @returns {Number} (webView or element scrollOffset)
     */
    get pageOffset() {
      return this.context.isScrollMode ? this.pageYOffset : this.pageXOffset;
    }
    /**
     * @returns {Number} (zero-base)
     */
    get curPage() {
      return this.pageOffset / this.context.pageUnit;
    }
    /**
     * @param {HTMLElement} wrapper
     * @param {Context} context
     */
    constructor(wrapper, context) {
      super();
      this._context = context;
      this.debugNodeLocation = false;
      this.setCustomMethod();
      this.setViewport();
    }
    setCustomMethod() {
      const reader = this;
      function getAdjustedBoundingClientRect() {
        return reader.adjustRect(this.getBoundingClientRect() || new MutableClientRect());
      }
      function getAdjustedClientRects() {
        const rects = this.getClientRects() || [];
        const newRects = [];
        for (let i = 0; i < rects.length; i += 1) {
          const rect = rects[i];
          if (rect.width <= 1) {
            continue;
          }
          newRects.push(rect);
        }
        return reader.adjustRects(newRects);
      }
      [Range, HTMLElement, SVGElement].forEach((type) => {
        type.prototype.getAdjustedBoundingClientRect = getAdjustedBoundingClientRect;
        type.prototype.getAdjustedClientRects = getAdjustedClientRects;
      });
    }
    getDefaultScale() {
      return 1;
    }
    setViewport() {
      const scale = this.getDefaultScale();
      const value = `width=device-width, height=device-height, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}, user-scalable=0`;
      let viewport = document.querySelector("meta[name=viewport]");
      if (viewport === null) {
        viewport = document.createElement("meta");
        viewport.id = "viewport";
        viewport.name = "viewport";
        document.getElementsByTagName("head")[0].appendChild(viewport);
      }
      viewport.content = value;
    }
    /**
     * @param {number} top
     * @param {number} bottom
     */
    changePadding(top, bottom) {
      const wrapperStyle = this.content.body.style;
      wrapperStyle.setProperty("padding-top", `${top}px`, "important");
      wrapperStyle.setProperty("padding-bottom", `${bottom}px`, "important");
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {{x: Number, y: Number}}
     */
    adjustPoint(x, y) {
      return { x, y };
    }
    /**
     * @param {ClientRect} rect
     * @returns {MutableClientRect}
     */
    adjustRect(rect) {
      return new MutableClientRect(rect);
    }
    /**
     * @param {ClientRect[]} rects
     * @returns {MutableClientRect[]}
     */
    adjustRects(rects) {
      return _Util.concatArray([], rects, (rect) => this.adjustRect(rect));
    }
    /**
     * @param {Context} context
     */
    changeContext(context) {
      this._context = context;
    }
    /**
     * @param {Number} offset
     */
    scrollTo(offset) {
      if (this.context.isScrollMode) {
        window.scroll(0, offset);
      } else {
        window.scroll(offset, 0);
      }
    }
    /**
     * el의 rect 기준점을 반환한다.
     *
     * @param {Node} el
     * @returns {String} (top or left)
     */
    getOffsetDirectionFromElement(el) {
      let direction = this.context.isScrollMode ? "top" : "left";
      if (el) {
        const position = _Util.getMatchedCSSValue(el, "position", true);
        if (direction === "left" && position === "absolute") {
          direction = "top";
        }
      }
      return direction;
    }
    /**
     * @param {String} anchor
     * @param {function} block
     * @returns {Number}
     * @private
     */
    _getOffsetFromAnchor(anchor, block) {
      const el = document.getElementById(anchor);
      if (el) {
        const iterator = _Util.createTextNodeIterator(el);
        const node = iterator.nextNode();
        if (node) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const { display } = window.getComputedStyle(el);
          const rects = range.getAdjustedClientRects();
          if (rects.length) {
            return block(rects[0], el);
          } else if (display === "none") {
            el.style.display = "block";
            const rect = el.getAdjustedBoundingClientRect();
            el.style.display = "none";
            return block(rect, el);
          }
        }
        return block(el.getAdjustedBoundingClientRect(), el);
      }
      return block({ left: null, top: null }, null);
    }
    /**
     * anchor의 위치를 구한다.
     * 페이지 넘김 보기일 경우 pageOffset(zero-base)을 반환하며,
     * 스크롤 보기일 경우 scrollY 값을 반환한다.
     * 위치를 찾을 수 없을 경우 null을 반환한다.
     *
     * @param {String} anchor
     * @returns {Number|null}
     */
    getOffsetFromAnchor(anchor) {
      return this._getOffsetFromAnchor(anchor, (rect, el) => {
        if (this.context.isScrollMode) {
          return rect.top === null ? null : rect.top + this.pageYOffset;
        }
        return rect.left === null ? null : this.getPageFromRect(rect, el);
      });
    }
    /**
     * serializedRange(rangy.js 참고)의 위치를 구한다.
     * 페이지 넘김 보기일 경우 page(zero-base)를 반환하며,
     * 스크롤 보기일 경우 scrollY 값을 반환한다.
     * 위치를 찾을 수 없을 경우 null을 반환한다.
     *
     * @param {String} serializedRange
     * @returns {Number|null}
     */
    getOffsetFromSerializedRange(serializedRange) {
      try {
        const range = this.getRangeFromSerializedRange(serializedRange);
        const rects = range.getAdjustedClientRects();
        if (rects.length > 0) {
          if (this.context.isScrollMode) {
            return rects[0].top + this.pageYOffset;
          }
          return this.getPageFromRect(rects[0]);
        }
        return null;
      } catch (e) {
        return null;
      }
    }
    /**
     * rects 중에 startOffset~endOffset 사이에 위치한 rect의 index를 반환한다.
     * type이 bottom일 때 -1을 반환하는 경우가 있을 수 있는데 이전 rects에 마지막 rect를 의미한다.
     *
     * @param {MutableClientRect[]} rects
     * @param {Number} startOffset
     * @param {Number} endOffset
     * @param {String} type (top or bottom)
     * @returns {Number|null}
     * @private
     */
    _findRectIndex(rects, startOffset, endOffset, type = "top") {
      const origin = this.context.isScrollMode ? "top" : "left";
      for (let j = 0; j < rects.length; j += 1) {
        const rect = rects[j];
        if (type === "bottom") {
          if (endOffset <= rect[origin] && rect.width > 0) {
            return j - 1;
          }
        } else if (startOffset <= rect[origin] && rect[origin] <= endOffset && rect.width > 0) {
          return j;
        }
      }
      return null;
    }
    /**
     * startOffset과 endOffset 사이에 위치한 node의 NodeLocation을 반환한다.
     * type으로 startOffset에 근접한 위치(top)를 찾을 것인지 endOffset에 근접한 위치(bottom)를 찾을 것인지 정할 수 있다.
     *
     * @param {Number} startOffset
     * @param {Number} endOffset
     * @param {String} type (top or bottom)
     * @param {String} posSeparator
     * @returns {String|null}
     */
    findNodeLocation(startOffset, endOffset, type = "top", posSeparator = "#") {
      this._latestNodeRect = null;
      const { nodes } = this.content;
      if (!nodes) {
        return null;
      }
      let prev = null;
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const range = document.createRange();
        range.selectNodeContents(node);
        let rect = range.getAdjustedBoundingClientRect();
        if (rect.isEmpty) {
          if (node.nodeName === "IMG") {
            range.selectNode(node);
            rect = range.getAdjustedBoundingClientRect();
            if (rect.isEmpty) {
              continue;
            }
          } else {
            continue;
          }
        }
        const origin = this.context.isScrollMode ? rect.top + rect.height : rect.left + rect.width;
        if (rect.width === 0 || origin < startOffset) {
          continue;
        }
        let rectIndex;
        if (node.nodeType === Node.TEXT_NODE) {
          const string = node.nodeValue;
          if (!string) {
            continue;
          }
          const words = string.split(_Util.getSplitWordRegex());
          let offset = range.startOffset;
          for (let j = 0; j < words.length; j += 1) {
            const word = words[j];
            if (word.trim().length) {
              try {
                range.setStart(node, offset);
                range.setEnd(node, offset + word.length);
              } catch (e) {
                return null;
              }
              const rects = range.getAdjustedClientRects();
              if ((rectIndex = this._findRectIndex(rects, startOffset, endOffset, type)) !== null) {
                if (rectIndex < 0) {
                  this._latestNodeRect = prev.rect;
                  return prev.location;
                }
                this._latestNodeRect = rects[rectIndex];
                return i + posSeparator + Math.min(j + rectIndex, words.length - 1);
              }
              for (let k = rects.length - 1; k >= 0; k -= 1) {
                if (rects[k].left < endOffset) {
                  prev = { location: `${i}${posSeparator}${j}`, rect: rects[k] };
                }
              }
            }
            offset += word.length + 1;
          }
        } else if (node.nodeName === "IMG") {
          const rects = range.getAdjustedClientRects();
          if ((rectIndex = this._findRectIndex(rects, startOffset, endOffset, type)) !== null) {
            if (rectIndex < 0) {
              this._latestNodeRect = prev.rect;
              return prev.location;
            }
            this._latestNodeRect = rects[rectIndex];
            return `${i}${posSeparator}0`;
          }
          for (let k = rects.length - 1; k >= 0; k -= 1) {
            if (rects[k].left < endOffset) {
              prev = { location: `${i}${posSeparator}0`, rect: rects[k] };
            }
          }
        }
      }
      return null;
    }
    /**
     * 마지막으로 구한 NodeLocation을 화면에 표시한다.
     */
    showNodeLocationIfNeeded() {
      if (!this.debugNodeLocation || this._latestNodeRect === null) {
        return;
      }
      let span = document.getElementById("RidiNodeLocation");
      if (!span) {
        span = document.createElement("span");
        span.setAttribute("id", "RidiNodeLocation");
        document.body.appendChild(span);
      }
      const rect = this._latestNodeRect;
      rect[this.context.isScrollMode ? "top" : "left"] += this.pageOffset;
      span.style.cssText = `position: absolute !important;background-color: red !important;left: ${rect.left}px !important;top: ${rect.top}px !important;width: ${rect.width || 3}px !important;height: ${rect.height}px !important;display: block !important;opacity: 0.4 !important;z-index: 99 !important;`;
    }
    /**
     * NodeLocation의 위치를 구한다.
     * 페이지 넘김 보기일 경우 page(zero-base)를 반환하며,
     * 스크롤 보기일 경우 scrollY 값을 반환한다.
     * 위치를 찾을 수 없을 경우 null을 반환한다.
     *
     * @param {String} location
     * @param {String} type (top or bottom)
     * @param {String} posSeparator
     * @returns {Number|null}
     */
    getOffsetFromNodeLocation(location, type = "top", posSeparator = "#") {
      const parts = location.split(posSeparator);
      const nodeIndex = parseInt(parts[0], 10);
      const wordIndex = parseInt(parts[1], 10);
      const { pageUnit, isScrollMode } = this.context;
      const { totalSize } = this;
      const { nodes } = this.content;
      if (nodeIndex === -1 || wordIndex === -1 || nodes === null) {
        return null;
      }
      const node = nodes[nodeIndex];
      if (!node) {
        return null;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      let rect = range.getAdjustedBoundingClientRect();
      if (rect.isEmpty) {
        if (node.nodeName === "IMG") {
          range.selectNode(node);
          rect = range.getAdjustedBoundingClientRect();
          if (rect.isEmpty) {
            return null;
          }
        } else {
          return null;
        }
      }
      let page = this.getPageFromRect(rect);
      if (page === null || totalSize <= pageUnit * page) {
        return null;
      }
      if (node.nodeName === "IMG" && wordIndex === 0) {
        if (isScrollMode) {
          return Math.max(rect.top + this.pageYOffset - (type === "bottom" ? pageUnit : 0), 0);
        }
        return page;
      }
      const string = node.nodeValue;
      if (string === null) {
        return null;
      }
      const words = string.split(_Util.getSplitWordRegex());
      let word;
      let offset = 0;
      for (let i = 0; i <= Math.min(wordIndex, words.length - 1); i += 1) {
        word = words[i];
        offset += word.length + 1;
      }
      try {
        range.setStart(range.startContainer, offset - word.length - 1);
        range.setEnd(range.startContainer, offset - 1);
      } catch (e) {
        return null;
      }
      rect = range.getAdjustedBoundingClientRect();
      page = this.getPageFromRect(rect);
      if (page === null || totalSize <= pageUnit * page) {
        return null;
      }
      if (rect.left < 0 || (page + 1) * pageUnit < rect.left + rect.width) {
        if (rect.width < pageUnit) {
          page += 1;
        } else {
          page += Math.floor(rect.width / pageUnit);
        }
      }
      if (isScrollMode) {
        return Math.max(rect.top + this.pageYOffset - (type === "bottom" ? pageUnit : 0), 0);
      }
      return page;
    }
    /**
     * @param {String} keyword
     * @returns {String}
     */
    searchText(keyword) {
      if (window.find(keyword, 0)) {
        return rangy.serializeRange(getSelection().getRangeAt(0), true, this.content.body);
      }
      return "null";
    }
    /**
     * @param {Number} pre
     * @param {Number} post
     * @returns {String}
     */
    textAroundSearchResult(pre, post) {
      const range = getSelection().getRangeAt(0);
      const start = range.startOffset;
      const newStart = Math.max(range.startOffset - pre, 0);
      const end = range.endOffset;
      const newEnd = Math.min(newStart + post, range.endContainer.length);
      range.setStart(range.startContainer, newStart);
      range.setEnd(range.endContainer, newEnd);
      const result = range.toString();
      range.setStart(range.startContainer, start);
      range.setEnd(range.endContainer, end);
      return result;
    }
    /**
     * @returns {MutableClientRect[]}
     */
    getRectsOfSearchResult() {
      return getSelection().getRangeAt(0).getAdjustedClientRects();
    }
    /**
     * @returns {Number} (zero-base)
     */
    getPageOfSearchResult() {
      const rects = this.getRectsOfSearchResult();
      return this.getPageFromRect(rects[0]);
    }
    /**
     * @param {String} serializedRange
     * @returns {Range}
     */
    getRangeFromSerializedRange(serializedRange) {
      const tmpRange = rangy.deserializeRange(serializedRange, this.content.body);
      const range = document.createRange();
      range.setStart(tmpRange.startContainer, tmpRange.startOffset);
      range.setEnd(tmpRange.endContainer, tmpRange.endOffset);
      tmpRange.detach();
      return range;
    }
    /**
     * @param {String} serializedRange
     * @returns {MutableClientRect[]}
     */
    getRectsFromSerializedRange(serializedRange) {
      const range = this.getRangeFromSerializedRange(serializedRange);
      return _Sel.getOnlyTextNodeRectsFromRange(range);
    }
    /**
     * @param {MutableClientRect} rect
     * @returns {MutableClientRect}
     */
    rectToAbsolute(rect) {
      const mutableRect = rect;
      if (this.context.isScrollMode) {
        mutableRect.top += this.pageYOffset;
      } else {
        mutableRect.left += this.pageXOffset;
      }
      return mutableRect;
    }
    /**
     * @param {MutableClientRect[]} rects
     * @param {Boolean} absolute
     * @returns {String}
     * @private
     */
    _rectsToCoord(rects, absolute = false) {
      const insets = { left: 0, top: 0 };
      if (absolute) {
        if (this.context.isScrollMode) {
          insets.top = this.pageYOffset;
        } else {
          insets.left = this.pageXOffset;
        }
      }
      let result = "";
      for (let i = 0; i < rects.length; i += 1) {
        const rect = rects[i];
        result += `${rect.left + insets.left},`;
        result += `${rect.top + insets.top},`;
        result += `${rect.width},`;
        result += `${rect.height},`;
      }
      return result;
    }
    /**
     * @param {MutableClientRect[]} rects
     * @returns {String}
     */
    rectsToAbsoluteCoord(rects) {
      return this._rectsToCoord(rects, true);
    }
    /**
     * @param {MutableClientRect[]} rects
     * @returns {String}
     */
    rectsToRelativeCoord(rects) {
      return this._rectsToCoord(rects);
    }
  };

  // vendor-src/ridi/src/common/_Content.es6
  var _Content = class extends _Object {
    /**
     * @returns {HTMLElement}
     */
    get wrapper() {
      return this._wrapper;
    }
    /**
     * @returns {HTMLElement}
     */
    get body() {
      return this.wrapper.getElementsByTagName("BODY")[0] || this.wrapper;
    }
    /**
     * @returns {Node[]}
     */
    get nodes() {
      return this._nodes;
    }
    /**
     * @returns {HTMLElement[]}
     */
    get images() {
      return this.wrapper.getElementsByTagName("IMG");
    }
    /**
     * @returns {boolean} 폰트 로드가 완료 되었는지를 반환한다.
     */
    get isFontsLoaded() {
      if (document.fonts) {
        const statusList = [];
        document.fonts.forEach((fontFace) => statusList.push(fontFace.status));
        if (statusList.indexOf("loading") >= 0) {
          return false;
        }
      }
      return true;
    }
    /**
     * @param {Reader} reader
     * @param {HTMLElement} wrapper
     */
    constructor(reader, wrapper) {
      super();
      this._reader = reader;
      this._wrapper = wrapper;
      this.updateNodes();
    }
    updateNodes() {
      this._nodes = this.fetchNodes();
    }
    /**
     * @param {Boolean} shouldManualFilter
     * @returns {Node[]}
     */
    fetchNodes(shouldManualFilter = false) {
      const filter = (node2) => node2.nodeType === Node.TEXT_NODE || node2.nodeType === Node.ELEMENT_NODE && node2.nodeName === "IMG";
      let calledFilter = false;
      const walk = document.createTreeWalker(
        this.body,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        shouldManualFilter ? null : {
          acceptNode: (node2) => {
            calledFilter = true;
            if (filter(node2)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        },
        false
      );
      const nodes = [];
      let node;
      while (node = walk.nextNode()) {
        if (calledFilter) {
          nodes.push(node);
        } else if (filter(node)) {
          nodes.push(node);
        }
      }
      return nodes;
    }
    /**
     * @param {HTMLElement} element
     * @returns {String}
     */
    getElementId(element) {
      const range = document.createRange();
      range.selectNodeContents(element);
      return rangy.serializeRange(range, true, this.body);
    }
    /**
     * @param {Boolean} hidden
     * @param {HTMLElement|String} any
     */
    setHidden(hidden, any) {
      let el;
      if (typeof any === "string") {
        try {
          const range = rangy.deserializeRange(any, this.body);
          if (range) {
            el = range.startContainer;
          }
        } catch (e) {
        }
        if (!el) {
          const [first] = document.getElementsByClassName(any);
          el = first || document.getElementById(any);
        }
      } else {
        el = any;
      }
      if (el) {
        el.style.visibility = hidden ? "hidden" : "";
      }
    }
    /**
     * @param {String} id
     * @param {Number} x
     * @param {Number} y
     * @returns {MutableClientRect[]}
     */
    getRectFromElementId(id, x, y) {
      try {
        const range = rangy.deserializeRange(id, this.body);
        const rects = range.startContainer.getAdjustedClientRects();
        let [rect] = rects;
        if (rects.length === 1) return rect;
        rect = rects.reduce((result, item) => {
          const mutable = result;
          const { left, right, top, height } = item;
          if (left <= x && x < right) {
            mutable.left += left;
            mutable.top += top;
          } else if (left >= 0 && x === void 0) {
            x = left;
            mutable.left += left;
            mutable.top += top;
          } else if (left < 0) {
            mutable.top -= height;
          }
          mutable.height += height;
          return mutable;
        }, new MutableClientRect({ width: rect.width }));
        rect.right = rect.left + rect.width;
        rect.bottom = rect.top + rect.height;
        return rect;
      } catch (e) {
        return null;
      }
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {Object}
     */
    getImageFromPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      if (el && el.nodeName === "IMG") {
        const id = this.getElementId(el);
        return {
          id,
          element: el,
          src: el.src || "null",
          rect: this.getRectFromElementId(id, x, y)
        };
      }
      return null;
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {Object}
     */
    getSvgFromPoint(x, y) {
      let el = document.elementFromPoint(x, y);
      while (el && el.nodeName !== "HTML" && el.nodeName !== "BODY") {
        if (el.nodeName.toLowerCase() === "svg") {
          let prefix = "<svg";
          const attrs = el.attributes;
          for (let i = 0; i < attrs.length; i += 1) {
            const attr = attrs[i];
            prefix += ` ${attr.nodeName}="${attr.nodeValue}"`;
          }
          prefix += ">";
          const svgEl = document.createElement("svgElement");
          const nodes = el.childNodes;
          for (let j = 0; j < nodes.length; j += 1) {
            svgEl.appendChild(nodes[j].cloneNode(true));
          }
          const id = this.getElementId(el);
          return {
            id,
            element: el,
            html: `${prefix}${svgEl.innerHTML}</svg>`,
            rect: this.getRectFromElementId(id, x, y)
          };
        }
        el = el.parentElement;
      }
      return null;
    }
    /**
     * @param {Node} el
     * @returns {{node: Node, href: string, type: string}}
     */
    getLinkFromElement(el) {
      let target = el;
      while (target) {
        if (target && target.nodeName === "A") {
          return {
            node: target,
            href: target.href,
            type: (target.attributes["epub:type"] || { value: "" }).value
          };
        }
        target = target.parentNode;
      }
      return null;
    }
    /**
     * @param {Node} imgEl
     * @param {Number} screenWidth
     * @param {Number} screenHeight
     * @returns {{el: Node, width: String, height: String, position: String,
     * size: {dWidth, dHeight, nWidth, nHeight, sWidth, sHeight, aWidth, aHeight}}}
     */
    reviseImage(imgEl, screenWidth, screenHeight) {
      const isPercentValue = (value) => {
        if (typeof value === "string") {
          return value.search(/%/);
        }
        return -1;
      };
      const compareSize = (size1, size2) => {
        const intVal = parseInt(size1, 10);
        if (!isNaN(intVal)) {
          if (isPercentValue(size1) !== -1) {
            if (intVal > 100) {
              return 1;
            } else if (intVal < 100) {
              return -1;
            }
          }
          if (size2 < intVal) {
            return 1;
          } else if (size2 > intVal) {
            return -1;
          }
        }
        return 0;
      };
      const calcRate = (width2 = 1, height2 = 1) => {
        let n;
        let m;
        if (width2 > height2) {
          n = height2;
          m = width2;
        } else {
          n = width2;
          m = height2;
        }
        return n / m * 100;
      };
      const maxHeight = 0.95;
      const size = _Util.getImageSize(imgEl);
      let cssWidth = "";
      let cssHeight = "";
      if (size.nWidth === 0 || size.nHeight === 0) {
        return {
          el: imgEl,
          width: cssWidth,
          height: cssHeight,
          position: "",
          size
        };
      }
      if (compareSize(size.sWidth, size.nWidth) > 0 || compareSize(size.aWidth, size.nWidth) > 0) {
        cssWidth = "initial";
      }
      if (compareSize(size.sHeight, size.nHeight) > 0 || compareSize(size.aHeight, size.nHeight) > 0) {
        cssHeight = "initial";
      }
      const diff = 1;
      let rate = 0;
      if (size.nWidth >= size.nHeight !== size.dWidth >= size.dHeight || Math.abs(calcRate(size.nWidth, size.nHeight) - calcRate(size.dWidth, size.dHeight)) > diff) {
        if (size.dWidth >= size.dHeight && size.dWidth < size.nWidth) {
          rate = calcRate(size.dWidth, size.nWidth) / 100;
          if (size.dWidth < screenWidth && Math.round(size.nHeight * rate) < screenHeight) {
            cssWidth = `${size.dWidth}px`;
            cssHeight = `${Math.round(size.nHeight * rate)}px`;
          } else {
            cssWidth = "initial";
            cssHeight = "initial";
          }
        } else if (size.dWidth < size.dHeight && size.dHeight < size.nHeight) {
          rate = calcRate(size.dHeight, size.nHeight) / 100;
          if (Math.round(size.nWidth * rate) < screenWidth && size.dHeight < screenHeight) {
            cssWidth = `${Math.round(size.nWidth * rate)}px`;
            cssHeight = `${size.dHeight}px`;
          } else {
            cssWidth = "initial";
            cssHeight = "initial";
          }
        } else {
          cssWidth = "initial";
          cssHeight = "initial";
        }
      }
      const width = parseInt(cssWidth, 10) || size.dWidth;
      const height = parseInt(cssHeight, 10) || size.dHeight;
      if (width > screenWidth || height > screenHeight) {
        const margin = _Util.getStylePropertiesIntValue(
          imgEl,
          ["line-height", "margin-top", "margin-bottom", "padding-top", "padding-bottom"]
        );
        const vmin = Math.min(screenWidth, screenHeight);
        let adjustHeight = Math.max((screenHeight - margin) * maxHeight, vmin * maxHeight);
        let adjustWidth = adjustHeight / size.nHeight * size.nWidth;
        if (adjustWidth > screenWidth) {
          adjustHeight *= screenWidth / adjustWidth;
          adjustWidth = screenWidth;
        }
        cssWidth = `${adjustWidth}px`;
        cssHeight = `${adjustHeight}px`;
      }
      return {
        el: imgEl,
        width: cssWidth,
        height: cssHeight,
        position: "",
        size
      };
    }
  };

  // vendor-src/ridi/src/android/Content.es6
  var Content = class extends _Content {
    get src() {
      return this._src;
    }
    constructor(reader, wrapper, src) {
      super(reader, wrapper);
      this._src = src;
    }
    /**
     * @param {Number} screenWidth
     * @param {Number} screenHeight
     */
    reviseImagesInSpine(screenWidth, screenHeight) {
      const results = [];
      const els = this.images;
      for (let i = 0; i < els.length; i += 1) {
        const el = els[i];
        const result = this.reviseImage(el, screenWidth, screenHeight);
        if (result.width.length || result.height.length || result.position.length) {
          results.push({
            el,
            width: result.width,
            height: result.height,
            position: result.position
          });
        }
      }
      results.forEach((result) => {
        const { el, width, height, position } = result;
        if (width.length) {
          el.style.width = width;
        }
        if (height.length) {
          el.style.height = height;
        }
        if (position.length) {
          el.style.position = position;
        }
      });
    }
    /**
     * @param {Node} imgEl
     * @param {Number} screenWidth
     * @param {Number} screenHeight
     * @returns {{el: Node, width: String, height: String, position: String,
     * size: {dWidth, dHeight, nWidth, nHeight, sWidth, sHeight, aWidth, aHeight}}}
     */
    reviseImage(imgEl, screenWidth, screenHeight) {
      const result = super.reviseImage(imgEl, screenWidth, screenHeight);
      if (result.size.dWidth === 0 || result.size.dHeight === 0) {
        let el = imgEl.parentElement;
        do {
          if (el.nodeName.match(/H[0-9]/)) {
            result.position = "absolute";
            break;
          }
        } while (el = el.parentElement);
      }
      return result;
    }
    /**
     * @param {string} id
     */
    findRectFromElementId(id) {
      const rect = this.getRectFromElementId(id);
      if (rect) {
        const { left, top, width, height } = this._reader.rectToAbsolute(rect);
        android.onElementRectFound(left, top, width, height);
      } else {
        android.onElementRectNotFound();
      }
    }
  };

  // vendor-src/ridi/src/common/Chrome.es6
  var Chrome = class extends _Object {
    /**
     * @returns {Number}
     */
    get version() {
      return this._version;
    }
    /**
     * @returns {Boolean}
     */
    get isCursed() {
      return this.isAndroid && (this.version === 47 || this.version >= 49 && this.version < 61 && this.version !== 52);
    }
    /**
     * @returns {Boolean}
     */
    get isAndroid() {
      return (navigator.userAgent || "").match(/android/gi) !== null;
    }
    /**
     * @returns {Number}
     */
    get pageWeight() {
      return this._pageWeight;
    }
    /**
     * @param {Number} pageWeight
     */
    set pageWeight(pageWeight) {
      this._pageWeight = pageWeight;
    }
    /**
     * @returns {Boolean}
     */
    get pageOverflow() {
      return this._pageOverflow;
    }
    /**
     * @param {Boolean} pageOverflow
     */
    set pageOverflow(pageOverflow) {
      this._pageOverflow = pageOverflow;
    }
    /**
     * @returns {Number}
     */
    get prevPage() {
      return this._prevPage;
    }
    /**
     * @param {Number} prevPage
     */
    set prevPage(prevPage) {
      this._prevPage = prevPage;
    }
    /**
     * @param {Reader} reader
     * @param {Number} curPage
     */
    constructor(reader, curPage = 0) {
      super();
      const chrome = ((navigator.userAgent || "").match(/chrome\/[\d]+/gi) || [""])[0];
      const version = parseInt((chrome.match(/[\d]+/g) || [""])[0], 10);
      if (!isNaN(version)) {
        this._version = version;
      }
      this._magic = 3;
      this.changedPage(curPage);
      this._scrollTracked = false;
      this._scrollListener = () => {
        if (!this.isCursed || reader.context.isScrollMode) {
          return;
        }
        const page = reader.curPage;
        const { prevPage, pageOverflow } = this;
        let { pageWeight } = this;
        if (page > prevPage) {
          pageWeight = Math.min(pageWeight + (page - prevPage), this._magic);
          if (!pageOverflow) {
            this.pageOverflow = pageWeight === this._magic;
          }
        } else if (page < prevPage) {
          pageWeight = Math.max(pageWeight - (prevPage - page), 0);
          if (pageWeight === 0) {
            this.pageOverflow = false;
          }
        }
        this.prevPage = page;
        this.pageWeight = pageWeight;
      };
    }
    /**
     * @param {Number} page
     */
    changedPage(page) {
      this.pageWeight = Math.min(page, this._magic);
      this.pageOverflow = this.pageWeight === this._magic;
      this.prevPage = page;
    }
    addScrollListenerIfNeeded() {
      if (!this._scrollTracked) {
        this._scrollTracked = true;
        window.addEventListener("scroll", this._scrollListener, true);
      }
    }
    removeScrollListenerIfNeeded() {
      if (this._scrollTracked) {
        this._scrollTracked = false;
        window.removeEventListener("scroll", this._scrollListener, true);
      }
    }
    /**
     * @param {Reader} reader
     * @param {Number} x
     * @param {Number} y
     * @returns {{x: Number, y: Number}}
     */
    adjustPoint(reader, x, y) {
      const point = { x, y };
      const { htmlClientWidth, bodyClientWidth, pageXOffset, context } = reader;
      if (context.isScrollMode) {
        return point;
      } else if (this.isCursed) {
        point.x += context.pageWidthUnit * this.pageWeight;
        if (this.pageOverflow) {
          point.x -= context.pageGap * this._magic;
          if (htmlClientWidth - bodyClientWidth === 1) {
            point.x += this._magic;
          }
        }
      } else if (this.version === 41 || this.version === 40) {
        point.x += pageXOffset;
      }
      return point;
    }
    /**
     * @param {Reader} reader
     * @param {ClientRect} rect
     * @returns {MutableClientRect}
     */
    adjustRect(reader, rect) {
      const { htmlClientWidth, bodyClientWidth, context } = reader;
      const adjustRect = new MutableClientRect(rect);
      if (this.isCursed && !context.isScrollMode) {
        adjustRect.left -= context.pageWidthUnit * this.pageWeight;
        adjustRect.right -= context.pageWidthUnit * this.pageWeight;
        if (this._pageOverflow) {
          adjustRect.left += context.pageGap * this._magic;
          adjustRect.right += context.pageGap * this._magic;
          if (htmlClientWidth - bodyClientWidth === 1) {
            adjustRect.left -= this._magic;
            adjustRect.right -= this._magic;
          }
        }
      }
      return adjustRect;
    }
  };

  // vendor-src/ridi/src/common/_Handler.es6
  var _Handler = class extends _Object {
    /**
     * @returns {Reader}
     */
    get reader() {
      return this._reader;
    }
    /**
     * @param {Reader} reader
     */
    constructor(reader) {
      super();
      this._reader = reader;
    }
    /**
     * 해당 좌표에서 링크를 찾아서 반환한다.
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {{node: Node, href: String, type: String}|null}
     */
    getLinkFromPoint(x, y) {
      if (document.links.length === 0) {
        return null;
      }
      const point = this.reader.adjustPoint(x, y);
      const tolerance = 12;
      const stride = 6;
      for (let x2 = point.x - tolerance; x2 <= point.x + tolerance; x2 += stride) {
        for (let y2 = point.y - tolerance; y2 <= point.y + tolerance; y2 += stride) {
          const el = document.elementFromPoint(x2, y2);
          if (el) {
            const link = this.reader.content.getLinkFromElement(el);
            if (link !== null) {
              return link;
            }
          }
        }
      }
      return null;
    }
  };

  // vendor-src/ridi/src/android/Util.es6
  var Util = class extends _Util {
    /**
     * @param {string} message
     */
    static toast(message = "") {
      android.onShowToast(message, message.length > 20 ? 1 : 0);
    }
  };
  Util.staticOverride(Util, _Util, ["toast"]);

  // vendor-src/ridi/src/android/Handler.es6
  var Handler = class extends _Handler {
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {String} nativePoints
     */
    processSingleTapEvent(x, y, nativePoints) {
      const link = this.getLinkFromPoint(x, y);
      if (link !== null) {
        const href = link.href || "";
        const type = link.type || "";
        if (href.length) {
          const range = document.createRange();
          range.selectNodeContents(link.node);
          const rects = this.reader.rectsToAbsoluteCoord(range.getAdjustedClientRects());
          const footnoteType = type === "noteref" ? 3 : 2;
          const text = link.node.textContent || "";
          let canUseFootnote = href.match(/^file:\/\//gm) !== null && (text.trim().match(Util.getFootnoteRegex()) !== null || footnoteType >= 3);
          if (canUseFootnote) {
            const src = href.replace(window.location.href, "");
            if (src[0] === "#" || src.match(this.reader.content.src) !== null) {
              const anchor = src.substring(src.lastIndexOf("#") + 1);
              const offset = this.reader.getOffsetFromAnchor(anchor);
              if (this.reader.context.isScrollMode) {
                canUseFootnote = offset >= this.reader.pageYOffset;
              } else {
                canUseFootnote = offset >= this.reader.curPage;
              }
            }
          }
          android.onLinkPressed(href, rects, canUseFootnote, footnoteType >= 3 ? text : null);
          return;
        }
      }
      android.onSingleTapEventNotProcessed(nativePoints);
    }
    /**
     * @param {Number} x
     * @param {Number} y
     */
    processImageZoomEvent(x, y) {
      const { content } = this.reader;
      const point = this.reader.adjustPoint(x, y);
      let result = content.getImageFromPoint(point.x, point.y);
      if (result) {
        const { left, top, width, height } = this.reader.rectToAbsolute(result.rect);
        android.onImageFound(result.src, result.id, left, top, width, height);
      } else {
        result = content.getSvgFromPoint(point.x, point.y);
        if (result) {
          const { left, top, width, height } = this.reader.rectToAbsolute(result.rect);
          android.onSvgFound(result.html, result.id, left, top, width, height);
        }
      }
    }
  };

  // vendor-src/ridi/src/android/Sel.es6
  var Sel = class extends _Sel {
    /**
     * @param {Range} range
     * @returns {Boolean}
     */
    isOutOfBounds(range) {
      const pageWidth = Util.getStylePropertyIntValue(this.reader.content.wrapper, "width");
      const testRange = document.createRange();
      testRange.selectNode(range.endContainer);
      const testRect = testRange.getAdjustedBoundingClientRect();
      return testRect.left > pageWidth;
    }
    /**
     * @returns {Number}
     */
    getUpperBound() {
      return this.reader.context.pageWidthUnit;
    }
    expandSelectionIntoNextPage() {
      if (super.expandSelectionIntoNextPage()) {
        const coord = this.getSelectedRectsCoord();
        if (coord.length) {
          android.onSelectionChangeIntoNextPage(coord);
        }
      }
    }
    /**
     * @param {Number} x
     * @param {Number} y
     */
    startSelectionMode(x, y) {
      if (super.startSelectionMode(x, y)) {
        const coord = this.getSelectedRectsCoord();
        if (coord.length) {
          android.onStartSelectionMode(coord);
        }
      }
    }
    /**
     * @param {Number} x
     * @param {Number} y
     */
    changeInitialSelection(x, y) {
      if (super.changeInitialSelection(x, y)) {
        const coord = this.getSelectedRectsCoord();
        if (coord.length) {
          android.onInitialSelectionChanged(coord);
        }
      }
    }
    /**
     * @param {Number} x
     * @param {Number} y
     */
    expandUpperSelection(x, y) {
      if (super.expandUpperSelection(x, y)) {
        const coord = this.getSelectedRectsCoord();
        if (coord.length) {
          android.onSelectionChanged(coord, this.getSelectedText());
        }
      }
    }
    /**
     * @param {Number} x
     * @param {Number} y
     */
    expandLowerSelection(x, y) {
      if (super.expandLowerSelection(x, y)) {
        const coord = this.getSelectedRectsCoord();
        if (coord.length) {
          android.onSelectionChanged(coord, this.getSelectedText());
        }
      }
    }
    requestSelectionInfo() {
      android.onSelectionInfo(this.getSelectedSerializedRange(), this.getSelectedText(), this.nextPageContinuable);
    }
  };

  // vendor-src/ridi/src/android/Reader.es6
  var Reader = class extends _Reader {
    /**
     * @returns {Chrome}
     */
    get chrome() {
      return this._chrome;
    }
    /**
     * @returns {Number}
     */
    get htmlClientWidth() {
      return this._htmlClientWidth;
    }
    /**
     * @returns {Number}
     */
    get bodyClientWidth() {
      return this._bodyClientWidth;
    }
    /**
     * @returns {Number}
     */
    get totalWidth() {
      const marginLeft = Util.getStylePropertyIntValue(this.content.wrapper, "margin-left");
      const marginRight = Util.getStylePropertyIntValue(this.content.wrapper, "margin-right");
      return super.totalWidth - (marginLeft + marginRight);
    }
    /**
     * @returns {Number}
     */
    get totalHeight() {
      const marginTop = Util.getStylePropertyIntValue(this.content.wrapper, "margin-top");
      const marginBottom = Util.getStylePropertyIntValue(this.content.wrapper, "margin-bottom");
      return super.totalHeight - (marginTop + marginBottom);
    }
    /**
     * @param {HTMLElement} wrapper
     * @param {Context} context
     * @param {Number} curPage (zero-base)
     * @param {String} contentSrc
     */
    constructor(wrapper, context, curPage, contentSrc) {
      super(wrapper, context);
      this._content = new Content(this, wrapper, contentSrc);
      this._handler = new Handler(this);
      this._sel = new Sel(this);
      this._chrome = new Chrome(this, curPage);
      this.chrome.addScrollListenerIfNeeded();
      this.calcPageForDoublePageMode = false;
      this._updateClientWidth();
    }
    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {{x: Number, y: Number}}
     */
    adjustPoint(x, y) {
      return this.chrome.adjustPoint(this, x, y);
    }
    /**
     * @param {ClientRect} rect
     * @returns {MutableClientRect}
     */
    adjustRect(rect) {
      return this.chrome.adjustRect(this, rect);
    }
    /**
     * @param {Context} context
     * @param {Number} curPage (zero-base)
     */
    changeContext(context, curPage) {
      super.changeContext(context);
      if (this.chrome.isCursed) {
        this.chrome.removeScrollListenerIfNeeded();
        this._chrome = new Chrome(this, curPage);
        this.chrome.addScrollListenerIfNeeded();
      }
    }
    /**
     * @param {Number} currentTime
     * @param {Number} start
     * @param {Number} change
     * @param {Number} duration
     * @returns {Number}
     * @private
     */
    _easeInOut(currentTime, start, change, duration) {
      let time = currentTime;
      time /= duration / 2;
      if (time < 1) {
        return change / 2 * time * time + start;
      }
      time -= 1;
      return -change / 2 * (time * (time - 2) - 1) + start;
    }
    /**
     * @param {Number} offset
     * @param {Boolean} animated
     */
    scrollTo(offset = 0, animated = false) {
      let adjustOffset = offset;
      const { body } = this.content;
      if (this.context.isScrollMode) {
        const height = this.context.pageHeightUnit;
        const paddingTop = Util.getStylePropertyIntValue(body, "padding-top");
        const paddingBottom = Util.getStylePropertyIntValue(body, "padding-bottom");
        const maxOffset = Math.max(this.totalHeight - height - paddingBottom, paddingTop);
        adjustOffset = Math.min(adjustOffset, maxOffset);
      } else if (this.calcPageCount() > -1) {
        const width = this.context.pageWidthUnit;
        const maxPage = Math.max(this.calcPageCount() - this.getExtraPageCount(), 0);
        adjustOffset = Math.min(adjustOffset, maxPage * width);
      }
      if (animated) {
        if (this._scrollTimer) {
          clearTimeout(this._scrollTimer);
          this._scrollTimer = null;
        }
        const start = this.context.isScrollMode ? this.pageYOffset : this.pageXOffset;
        const change = adjustOffset - start;
        const increment = 20;
        const duration = 200;
        const animateScroll = (elapsedTime) => {
          const time = elapsedTime + increment;
          super.scrollTo(this._easeInOut(time, start, change, duration));
          if (time < duration) {
            this._scrollTimer = setTimeout(() => {
              animateScroll(time);
            }, increment);
          } else {
            this._scrollTimer = null;
          }
        };
        animateScroll(0);
      } else {
        super.scrollTo(adjustOffset);
      }
    }
    /**
     * @returns {number}
     */
    getExtraPageCount() {
      const height = this.context.pageHeightUnit;
      const marginBottom = Util.getStylePropertyIntValue(this.content.body, "margin-bottom");
      return marginBottom / (this.context.isDoublePageMode ? height * 2 : height);
    }
    /**
     * @returns {Number}, -1은 재요청이 필요함을 의미
     */
    calcPageCount() {
      if (!this.content.isFontsLoaded) {
        return -1;
      }
      if (this.context.isScrollMode) {
        return Math.round(this.totalHeight / this.context.pageHeightUnit);
      }
      const columnWidth = this.context.pageWidthUnit - this.context.pageGap;
      if (this.totalWidth < columnWidth) {
        return -1;
      }
      const version = this.context.chromeMajorVersion;
      if (version >= 45 && version < 60) {
        const bodyHeight = parseFloat(window.getComputedStyle(this.content.body).height, 10);
        let pageCount = bodyHeight / this.context.pageHeightUnit;
        if (this.context.isDoublePageMode) {
          pageCount /= 2;
        }
        return Math.max(Math.ceil(pageCount), 1);
      }
      return Math.ceil(this.totalWidth / this.context.pageWidthUnit);
    }
    /**
     * @param {MutableClientRect} rect
     * @param {Node} el
     * @returns {Number|null} (zero-base)
     */
    getPageFromRect(rect, el) {
      if (rect === null) {
        return null;
      }
      const direction = this.getOffsetDirectionFromElement(el);
      const origin = rect[direction] + this.pageOffset;
      const pageUnit = direction === "left" ? this.context.pageWidthUnit : this.context.pageHeightUnit;
      const offset = origin / pageUnit;
      const fOffset = Math.floor(offset);
      if (this.calcPageForDoublePageMode) {
        const rOffset = Math.round(offset);
        if (fOffset === rOffset) {
          return fOffset;
        }
        return rOffset - 0.5;
      }
      return fOffset;
    }
    /**
     * @param {Number} index
     * @param {String} serializedRange
     */
    getRectsFromSerializedRange(index, serializedRange) {
      const rects = super.getRectsFromSerializedRange(serializedRange);
      android.onRectsOfSerializedRange(index, serializedRange, this.rectsToAbsoluteCoord(rects));
    }
    /**
     * @param {String} type (top or bottom)
     * @param {String} posSeparator
     */
    getNodeLocationOfCurrentPage(type = "top", posSeparator = "#") {
      const startOffset = 0;
      const endOffset = this.context.pageUnit;
      const location = this.findNodeLocation(startOffset, endOffset, type, posSeparator);
      this.showNodeLocationIfNeeded();
      if (!location) {
        android.onNodeLocationOfCurrentPageNotFound();
        return;
      }
      android.onNodeLocationOfCurrentPageFound(location);
    }
    fixColumnCollapseIssue(padding) {
      const id = "LayoutNG-last-sentence-missing-or-body-padding-ignored-error-workaround";
      let div = document.getElementById(id);
      if (!div) {
        div = document.createElement("div");
        div.setAttribute("id", id);
        div.setAttribute("style", `height: ${padding}px;`);
        document.body.appendChild(div);
      }
    }
    getDefaultScale() {
      return this.context.nativeDenstiy / window.devicePixelRatio;
    }
    /**
     * @param {Number} width
     * @param {Number} height
     * @param {Number} gap
     * @param {String} style
     */
    changePageSizeWithStyle(width, height, gap, style) {
      let prevPage = this.curPage;
      this.changeContext(Object.assign(this.context, { _width: width, _height: height, _gap: gap }));
      const styleElements = document.getElementsByTagName("style");
      const styleElement = styleElements[styleElements.length - 1];
      styleElement.innerHTML = style;
      this.setViewport();
      this._updateClientWidth();
      setTimeout(() => {
        const maxPage = this.calcPageCount();
        if (maxPage > -1) {
          prevPage = Math.min(prevPage, Math.max(maxPage - 1 - this.getExtraPageCount(), 0));
        }
        this.scrollTo(prevPage * this.context.pageUnit);
      }, 0);
    }
    _updateClientWidth() {
      this._htmlClientWidth = this.content.wrapper.clientWidth;
      this._bodyClientWidth = this.content.body.clientWidth;
    }
    /**
     * @param {*} args
     * @private
     */
    _moveTo(...args) {
      const method = args[0];
      if (this.context.isScrollMode) {
        const scrollY = this[`getOffsetFrom${method}`](args[1]);
        if (scrollY !== null) {
          android[`onScrollYOffsetOf${method}Found`](android.dipToPixel(scrollY));
          return;
        }
      } else {
        const page = this[`getOffsetFrom${method}`](args[1]);
        if (page !== null) {
          android[`onPageOffsetOf${method}Found`](page);
          return;
        }
      }
      android[`on${method}NotFound`]();
    }
    /**
     * @param {string} anchor
     */
    moveToAnchor(anchor) {
      this._moveTo("Anchor", anchor);
    }
    /**
     * @param {string} serializedRange
     */
    moveToSerializedRange(serializedRange) {
      this._moveTo("SerializedRange", serializedRange);
    }
    /**
     * @param {string} location
     */
    moveToNodeLocation(location) {
      this._moveTo("NodeLocation", location);
    }
  };

  // vendor-src/ridi/src/common/tts/TTSPiece.es6
  var TTSPiece = class {
    /**
     * @returns {Number}
     */
    get nodeIndex() {
      return this._nodeIndex;
    }
    /**
     * @returns {Number}
     */
    get startWordIndex() {
      return this._startWordIndex;
    }
    /**
     * @returns {Number}
     */
    get endWordIndex() {
      return this._endWordIndex;
    }
    /**
     * @returns {Node}
     */
    get node() {
      return this._node;
    }
    /**
     * @returns {String}
     */
    get text() {
      return this._text;
    }
    /**
     * @returns {Number}
     */
    get length() {
      return this._length;
    }
    /**
     * node.nodeValue (piece.text 아님) 의 좌측 끝에서 startWordIndex에 해당하는 단어의 첫 글자까지의 offset
     *
     * @returns {Number}
     */
    get paddingLeft() {
      return this._paddingLeft;
    }
    /**
     * node.nodeValue (piece.text 아님) 의 우측 끝에서 endWordIndex에 해당하는 단어의 마지막 글자까지의 offset
     *
     * @returns {Number}
     */
    get paddingRight() {
      return this._paddingRight;
    }
    /**
     * @param {Node} node
     * @param {Number} nodeIndex
     * @param {Number} startWordIndex
     * @param {Number} endWordIndex
     */
    constructor(node, nodeIndex, startWordIndex = -1, endWordIndex = -1) {
      this._node = node;
      this._nodeIndex = nodeIndex;
      const { nodeValue } = this._node;
      this._paddingLeft = 0;
      this._paddingRight = 0;
      this._text = "";
      this._startWordIndex = -1;
      this._endWordIndex = -1;
      this._isInvalid = false;
      if (typeof nodeValue === "string") {
        if (startWordIndex < 0 && endWordIndex < 0) {
          this._text = nodeValue;
        } else {
          const words = nodeValue.split(TTSUtil.getSplitWordRegex());
          if (startWordIndex >= words.length || endWordIndex >= words.length) {
            throw new Error(`TTSPiece: wordIndex is out of bounds - startWordIndex: (${startWordIndex}/${words.length - 1}), endWordIndex: (${endWordIndex}/${words.length - 1}).`);
          } else if (startWordIndex < 0) {
            this._startWordIndex = 0;
          } else {
            this._startWordIndex = startWordIndex;
          }
          this._endWordIndex = endWordIndex < 0 ? words.length - 1 : endWordIndex;
          words.forEach((word, i, list) => {
            if (i >= this._startWordIndex && i <= this._endWordIndex) {
              this._text += `${word}${i === list.length - 1 || i === this._endWordIndex ? "" : " "}`;
            } else if (i < this._startWordIndex) {
              this._paddingLeft += word.length + 1;
            } else {
              this._paddingRight += word.length + 1;
            }
          });
        }
      } else if (this._node.nodeName === "IMG") {
        this._text = this._node.alt || "";
      }
      this._length = this._text.length;
      this._isInvalid = this._checkIsInvalid();
    }
    /**
     * isInvalid 상태를 확인
     * @private
     * @returns {Boolean}
     */
    _checkIsInvalid() {
      const node = this._node;
      let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const readable = (el.attributes["data-ridi-tts"] || { value: "" }).value.toLowerCase();
      let valid = true;
      if (this.length === 0 || readable === "no") {
        valid = false;
      } else if (readable !== "yes") {
        if (_Util.getMatchedCSSValue(el, "display") === "none" || _Util.getMatchedCSSValue(el, "visibility") === "hidden") {
          valid = false;
        } else {
          do {
            if (el.nodeName === "A" && this._text.match(_Util.getFootnoteRegex()) !== null) {
              valid = false;
              break;
            }
            if (el.nodeName.toLowerCase() === "script") {
              valid = false;
              break;
            }
            if (el && el.nodeType === Node.ELEMENT_NODE) {
              if (el._cachedEmptyState !== void 0) {
                if (el._cachedEmptyState === true) {
                  valid = false;
                  break;
                }
              } else {
                try {
                  const isEmpty = el.innerText.trim().length === 0;
                  el._cachedEmptyState = isEmpty;
                  if (isEmpty) {
                    valid = false;
                    break;
                  }
                } catch (e) {
                  el._cachedEmptyState = false;
                }
              }
            }
            if (!(valid = ["RT", "RP", "SUB", "SUP", "IMG"].indexOf(el.nodeName) === -1)) {
              break;
            }
          } while (el = el.parentNode);
        }
      }
      return !valid;
    }
    /**
     * @returns {Boolean}
     */
    isInvalid() {
      return this._isInvalid;
    }
    /**
     * NodeLocation을 작업할 때 br 태그로 newLine이 가능하다는 것을 잊고 있었음;
     * NodeLocation이 정식 버전에 들어간 상태라 br 태그를 textAndImageNodes에 포함시킬 수도 없고.. 이런식으로... 허허;
     * <span><strong>TEXT</strong></span><br> 이런 경우에 대비하여 parentNode의 sibling까지 탐색하고 있다.
     *
     * @param {Boolean} checkNextSibling
     * @returns {Boolean}
     */
    isSiblingBrRecursive(checkNextSibling = true) {
      let node = this._node;
      while (node) {
        let sibling = node[checkNextSibling ? "nextSibling" : "previousSibling"];
        while (sibling) {
          if (sibling.nodeName === "BR") {
            return true;
          }
          const nodes = sibling.childNodes;
          if (nodes.length > 0) {
            sibling = nodes[checkNextSibling ? 0 : nodes.length - 1];
          } else {
            return false;
          }
        }
        node = node.parentNode;
      }
      return false;
    }
    /**
     * @returns {Boolean}
     */
    isOnlyWhitespace() {
      const pNode = this._node.previousSibling;
      const regex = TTSUtil.getWhitespaceAndNewLineRegex(null, `{${this.length},}`);
      let only = this.text.match(regex) !== null;
      if (only) {
        only = this._node.parentElement.nodeName !== "SPAN";
        if (pNode !== null) {
          only = pNode.nodeName !== "SPAN";
        }
      }
      return only;
    }
    /**
     * @returns {Boolean}
     */
    isSentence() {
      return this.text.trim().match(TTSUtil.getSentenceRegex(null, "$")) !== null;
    }
  };

  // vendor-src/ridi/src/common/tts/TTSRange.es6
  var TTSRange = class {
    /**
     * @returns {Number}
     */
    get startOffset() {
      return this._startOffset;
    }
    /**
     * @returns {Number}
     */
    get endOffset() {
      return this._endOffset;
    }
    /**
     * @param {Number} startOffset
     * @param {Number} endOffset
     */
    constructor(startOffset, endOffset) {
      this._startOffset = startOffset;
      this._endOffset = endOffset;
    }
  };

  // vendor-src/ridi/src/common/tts/TTSUtterance.es6
  var TTSUtterance = class _TTSUtterance {
    /**
     * @returns {String}
     */
    get text() {
      return this._text;
    }
    /**
     * @returns {Number}
     */
    get length() {
      return this._length;
    }
    /**
     * @param {String} text
     */
    constructor(text) {
      this._text = text;
      this._length = text.length;
    }
    /**
     * 개행문자는 읽을 때 잡음으로 변환되기 때문에 제거한다.
     *
     * @returns {TTSUtterance}
     */
    removeNewLine() {
      return new _TTSUtterance(this.text.replace(TTSUtil.getNewLineRegex(), " "));
    }
    /**
     * 읽지 말아야할 특수문자를 제거한다.
     * (사용자 사전으로 처리할 수 없기 때문에 코드로)
     *
     * @param {String[]} characters
     * @returns {TTSUtterance}
     */
    removeSpecialCharacters(characters) {
      const regex = new RegExp(`[${characters.join("")}]`, "gm");
      return new _TTSUtterance(this.text.replace(regex, " "));
    }
    /**
     * 한자 단독으로 쓰이기보다 한글음과 같이 쓰일 때가 많아 중복 발음을 없애기 위해 한자를 제거한다.
     * TODO: 한자 단독으로 쓰일 때 처리하기
     *
     * @returns {TTSUtterance}
     */
    removeHanja() {
      let { text } = this;
      for (let i = 0; i < this.length; i += 1) {
        if (TTSUtil.isChineseCharCode(text.charCodeAt(i))) {
          text = text.replace(text.substr(i, 1), " ");
        }
      }
      return new _TTSUtterance(text);
    }
    /**
     * // 한글과 영문이 붙어 있을 때 이후에 오는 문자가 공백, 마침표를 의미한다거나 한글과 영문이 붙어 있다면, 영문을 제거한다.
     *
     * @returns {TTSUtterance}
     */
    removeLatin() {
      const removeList = [];
      const { text, length } = this;
      let startOffset = -1;
      let i;
      let j;
      let k;
      let ch;
      let nextCh;
      let prevCode;
      let code;
      let nextCode;
      const checkRemoveRange = (start, end) => {
        if (end - start > 1) {
          removeList.push({ startOffset: start, endOffset: end });
        }
        startOffset = -1;
      };
      for (i = 0; i < length; i += 1) {
        code = text.charCodeAt(i);
        if (i > 0 && TTSUtil.isLatinCharCode(code)) {
          let isAbbr = false;
          prevCode = text.charCodeAt(i - 1);
          if (i + 1 < length) {
            nextCode = text.charCodeAt(i + 1);
            isAbbr = TTSUtil.isLatinCharCode(code, "u") && TTSUtil.isLatinCharCode(nextCode, "u");
          }
          if (!isAbbr && TTSUtil.isHangulCharCode(prevCode)) {
            startOffset = i;
          }
          if (startOffset > 0) {
            for (j = i + 1; j < length; j += 1) {
              code = text.charCodeAt(j);
              ch = text.charAt(j);
              if (TTSUtil.isSpaceCharCode(code) || TTSUtil.isLastCharOfSentence(ch) || ch === ":" || ch === ",") {
                if (j + 1 < length) {
                  let ignoreCount = 1;
                  for (k = j + 1; k < length; k += 1) {
                    nextCode = text.charCodeAt(k);
                    nextCh = text.charAt(k);
                    if (TTSUtil.isSpaceCharCode(nextCode) || nextCh === ":" || nextCh === ",") {
                      ignoreCount += 1;
                    } else if (TTSUtil.isLatinCharCode(nextCode)) {
                      j = k;
                      break;
                    } else {
                      checkRemoveRange(startOffset, k - ignoreCount);
                      j = k - ignoreCount;
                      break;
                    }
                  }
                } else {
                  checkRemoveRange(startOffset, j);
                }
              } else if (!TTSUtil.isLatinCharCode(code)) {
                if (j + 1 < length) {
                  nextCode = text.charCodeAt(j + 1);
                  if (TTSUtil.isLatinCharCode(nextCode)) {
                    j += 1;
                    continue;
                  }
                }
                checkRemoveRange(startOffset, j);
              }
              if (startOffset === -1) {
                break;
              }
            }
            if (startOffset !== -1) {
              checkRemoveRange(startOffset, length);
            }
          }
        }
      }
      let result = "";
      let endOffset = 0;
      for (i = 0, startOffset = 0; i < removeList.length; i += 1) {
        endOffset = removeList[i].startOffset;
        result += text.substring(startOffset, endOffset);
        startOffset = removeList[i].endOffset;
      }
      result += text.substring(startOffset, length);
      return new _TTSUtterance(result);
    }
    /**
     * 한글에 틸드 문자가 붙을 경우 소리를 늘리는 의미기에 자모에 맞춰 늘려준다.
     *
     * @returns {TTSUtterance}
     */
    replaceTilde() {
      const extendTable = [
        "\uC544",
        "\uC5D0",
        "\uC544",
        "\uC5D0",
        "\uC5B4",
        "\uC5D0",
        "\uC5B4",
        "\uC5D0",
        "\uC624",
        "\uC544",
        "\uC5D0",
        "\uC5D0",
        "\uC624",
        "\uC6B0",
        "\uC5B4",
        "\uC5D0",
        "\uC774",
        "\uC6B0",
        "\uC73C",
        "\uC73C",
        "\uC774"
      ];
      const textLength = this.length;
      let { text } = this;
      let offset = -1;
      let i;
      let j;
      let k;
      for (i = 0; i < textLength; i += 1) {
        const code = text.charCodeAt(i);
        if (TTSUtil.isTildeCharCode(code)) {
          if (i > 0) {
            let isRangeTilde = false;
            for (j = i + 1; j < textLength; j += 1) {
              const nextCode = text.charCodeAt(j);
              if (TTSUtil.isSpaceCharCode(nextCode)) {
                continue;
              } else if (TTSUtil.isDigitCharCode(nextCode)) {
                isRangeTilde = true;
                break;
              } else {
                break;
              }
            }
            if (!isRangeTilde) {
              const prevCode = text.charCodeAt(i - 1);
              if (TTSUtil.isHangulCharCode(prevCode) && TTSUtil.getFinalCharCode(prevCode) === 0) {
                const index = TTSUtil.getMedialCharCodeIndex(prevCode);
                text = text.replace(text.substr(i, 1), extendTable[index]);
                offset = i;
              } else if (TTSUtil.isLatinCharCode(prevCode)) {
                text = text.replace(text.substr(i, 1), text.substr(i - 1, 1));
                offset = i;
              }
            }
          }
        }
      }
      if (offset !== -1) {
        let insertRest = true;
        for (k = offset + 1; k < textLength; k += 1) {
          if (TTSUtil.isHangulCharCode(text.charCodeAt(k))) {
            insertRest = false;
            break;
          } else if (text[k] !== "?" && text[k] !== "!") {
            break;
          }
        }
        if (insertRest) {
          if (textLength <= k) {
            text += ",";
          } else {
            text = `${text.substr(0, k)},${text.substr(k)}`;
          }
        }
      }
      text = text.replace(/∼|〜/gm, () => "\uC5D0\uC11C ");
      return new _TTSUtterance(text);
    }
    /**
     * @param {String[]} strs
     * @returns {TTSUtterance}
     */
    removeAllRepeatedCharacter(strs) {
      let { text } = this;
      for (let i = 0; i < strs.length; i += 1) {
        const regex = new RegExp(`${strs[i]}{2,}`, "gm");
        text = text.replace(regex, "");
      }
      return new _TTSUtterance(text);
    }
    /**
     * @returns {TTSUtterance}
     */
    replaceNumeric() {
      const Type = {
        None: -1,
        Latin: 0,
        HangulNotation: 1,
        HangulOrdinal: 2,
        Time: 3
      };
      let { text } = this;
      text = text.replace(/([\d]{0,})[,]([\d]{3,})/gm, "$1$2");
      const map = {
        "\u2150": "\uCE60 \uBD84\uC758 \uC77C",
        "\u2151": "\uAD6C \uBD84\uC758 \uC77C",
        "\u2152": "\uC2ED \uBD84\uC758 \uC77C",
        "\u2153": "\uC0BC \uBD84\uC758 \uC77C",
        "\u2154": "\uC0BC \uBD84\uC758 \uC774",
        "\u2155": "\uC624 \uBD84\uC758 \uC77C",
        "\u2156": "\uC624 \uBD84\uC758 \uC774",
        "\u2157": "\uC624 \uBD84\uC758 \uC0BC",
        "\u2158": "\uC624 \uBD84\uC758 \uC0AC",
        "\u2159": "\uC721 \uBD84\uC758 \uC77C",
        "\u215A": "\uC721 \uBD84\uC758 \uC624",
        "\u215B": "\uD314 \uBD84\uC758 \uC77C",
        "\u215C": "\uD314 \uBD84\uC758 \uC0BC",
        "\u215D": "\uD314 \uBD84\uC758 \uC624",
        "\u215E": "\uD314 \uBD84\uC758 \uCE60"
      };
      text = text.replace(/⅐|⅑|⅒|⅓|⅔|⅕|⅖|⅗|⅘|⅙|⅚|⅛|⅜|⅝|⅞/gm, (matched) => map[matched]);
      text = text.replace(/([\d]{1,2})[Xx×]{2}/gm, "$100");
      const pattern = /[\d]{1,}/gm;
      let match;
      let startOffset;
      let endOffset;
      let i;
      let code;
      let ch;
      while ((match = pattern.exec(text)) !== null) {
        startOffset = match.index;
        endOffset = pattern.lastIndex;
        const origin = text.substring(startOffset, endOffset);
        const numeric = parseInt(origin, 10);
        if (!isFinite(numeric)) {
          continue;
        }
        let type = startOffset === 0 ? Type.HangulNotation : Type.None;
        let spaceCount = 0;
        for (i = startOffset - 1; i >= 0; i -= 1) {
          code = text.charCodeAt(i);
          if (TTSUtil.isSpaceCharCode(code)) {
            spaceCount += 1;
          } else if (TTSUtil.isColonCharCode(code)) {
            type = Type.Time;
            break;
          } else if (i < startOffset - 1 && TTSUtil.isLatinCharCode(code, "l")) {
            type = Type.Latin;
            break;
          } else {
            type = Type.None;
            break;
          }
        }
        if (spaceCount === startOffset) {
          type = Type.HangulNotation;
        }
        for (i = endOffset; i < text.length; i += 1) {
          code = text.charCodeAt(i);
          ch = text.charAt(i);
          const nextCh = text.charAt(i + 1);
          if (TTSUtil.isSpaceCharCode(code)) {
            continue;
          } else if (type === Type.Time || TTSUtil.isColonCharCode(code)) {
            type = Type.Time;
            break;
          } else if (endOffset < i && (type === Type.Latin || TTSUtil.isLatinCharCode(code, "l"))) {
            type = Type.Latin;
            break;
          } else if (type !== Type.Latin && ch === ".") {
            type = Type.None;
            break;
          } else if (ch === "\uC7A5" || ch === "\uAD8C") {
            type = Type.HangulNotation;
            break;
          } else if (TTSUtil.isLastCharOfSentence(ch)) {
            break;
          } else if (i === endOffset && (ch = TTSUtil.numericToOrdinalString(numeric, ch + nextCh)) !== null) {
            type = Type.HangulOrdinal;
            break;
          } else {
            type = Type.None;
            break;
          }
        }
        let string;
        if (type === Type.HangulNotation || type === Type.HangulOrdinal || type === Type.Latin) {
          if (type === Type.HangulOrdinal) {
            string = ch;
          } else {
            string = TTSUtil.numericToNotationString(numeric, type !== Type.Latin);
          }
        } else {
          string = origin;
        }
        text = `${text.substr(0, startOffset)}${string}${text.substr(endOffset)}`;
      }
      return new _TTSUtterance(text);
    }
    /**
     * 소괄호를 읽지 못하게 했지만 읽어야할 경우가 있기 때문에 이를 보정해준다.
     *
     * @returns {TTSUtterance}
     */
    replaceBracket() {
      const pattern = /\([\d]{1,2}\)/gm;
      let { text } = this;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const startOffset = match.index;
        const endOffset = pattern.lastIndex;
        const string = text.substring(startOffset + 1, endOffset - 1);
        if (startOffset === 0 || startOffset - 1 >= 0 && text.substr(startOffset - 1, 1) === " ") {
          text = `${text.substr(0, startOffset)}[${string}]${text.substr(endOffset)}`;
        }
      }
      text = text.replace(/\(([가나다라마바사아자차카타파하OX])\)/gm, "[$1]");
      return new _TTSUtterance(text);
    }
    /**
     * 판타지 소설에서 '=' 문자로 구분선을 만들기 때문에 사용자 사전에 넣지는 못하고 수동으로.. '=' 하나만
     *
     * @returns {TTSUtterance}
     */
    replaceEqual() {
      return new _TTSUtterance(this.text.replace(/([^=])([=]{1})([^=])/gm, "$1\uB294 $3"));
    }
    /**
     * TODO: 영문 월을 한글로 변환하기
     *
     * @returns {TTSUtterance}
     */
    replaceDate() {
      return new _TTSUtterance(this.text);
    }
    /**
     * 말줄임표, 쉼표를 의미하는 문자는 정말 쉬게 만들어준다.
     *
     * @returns {TTSUtterance}
     */
    insertPauseTag() {
      let { text } = this;
      text = text.replace(/([\D])([·]{2,})([\D])/gm, "$1<pause='200ms'>$2$3");
      text = text.replace(/([|_]{1})/gm, "<pause='400ms'>$1");
      text = text.replace(/([…]{1,})/gm, "<pause='400ms'>$1");
      text = text.replace(/([\D])(-|―){1,}([\D])/gm, "$1<pause='200ms'>$2$3");
      text = text.replace(/^([\s]{0,}[\d]{1,}[\s]{1,})([^-―·|…_<])/gm, "$1<pause='200ms'>$2");
      return new _TTSUtterance(text);
    }
  };

  // vendor-src/ridi/src/common/tts/TTSChunk.es6
  var TTSChunk = class _TTSChunk {
    /**
     * @returns {TTSRange}
     */
    get range() {
      return this._range;
    }
    /**
     * @param {TTSRange} newRange
     */
    set range(newRange) {
      if (newRange instanceof TTSRange) {
        this._range = newRange;
      } else {
        this._range = new TTSRange(0, this._getFullText().length);
      }
    }
    /**
     * @param {TTSPiece} pieces
     * @param {TTSRange} range
     */
    constructor(pieces, range = null) {
      this._pieces = pieces;
      this.range = range;
    }
    /**
     * @param {Reader} reader
     * @returns {{nodeIndex: Number, wordIndex: Number, text: (String), rects: String}}
     */
    toJSONForNative(reader) {
      return {
        nodeIndex: this.getStartNodeIndex(),
        wordIndex: this.getStartWordIndex(),
        text: this.getUtterance().text,
        rects: reader.rectsToAbsoluteCoord(this.getClientRects(true))
      };
    }
    /**
     * @returns {String}
     * @private
     */
    _getFullText() {
      let fullText = "";
      this._pieces.forEach((piece) => {
        fullText += piece.text;
      });
      return fullText;
    }
    /**
     * @returns {String}
     */
    getText() {
      return this._getFullText().substring(this.range.startOffset, this.range.endOffset);
    }
    /**
     * @returns {TTSUtterance}
     */
    getUtterance() {
      return new TTSUtterance(this.getText()).removeNewLine().removeSpecialCharacters(["\u226A", "\u226B"]).removeHanja().removeLatin().removeAllRepeatedCharacter(["<", ">", "_", "\xD7"]).replaceTilde().replaceNumeric().replaceBracket().replaceEqual().replaceDate().insertPauseTag();
    }
    /**
     * @param {Number} offset
     * @returns {TTSPiece|null}
     */
    getPiece(offset) {
      let length = 0;
      return TTSUtil.find(this._pieces, (piece) => {
        length += piece.length;
        return offset <= length;
      });
    }
    /**
     * @param {TTSPiece} piece
     * @returns {Number}
     */
    getOffset(piece) {
      let offset = piece.paddingLeft;
      return this._pieces.find((item) => {
        if (item === piece) {
          return true;
        }
        offset += item.length;
        return false;
      }) !== void 0 ? offset : 0;
    }
    /**
     * @returns {TTSPiece|null}
     */
    getStartWordPiece() {
      return this.getPiece(this.range.startOffset);
    }
    /**
     * @returns {TTSPiece|null}
     */
    getEndWordPiece() {
      return this.getPiece(this.range.endOffset);
    }
    /**
     * @returns {Number|null}
     */
    getStartNodeIndex() {
      return this.getStartWordPiece().nodeIndex;
    }
    /**
     * @returns {Number|null}
     */
    getEndNodeIndex() {
      return this.getEndWordPiece().nodeIndex;
    }
    /**
     * @returns {Number}
     */
    getStartWordIndex() {
      const piece = this.getStartWordPiece();
      let offsetBeforeNode = 0;
      for (let i = 0; i < this._pieces.length; i += 1) {
        const currentPiece = this._pieces[i];
        if (currentPiece.nodeIndex >= piece.nodeIndex) {
          offsetBeforeNode += currentPiece.text.search(/\S/);
          break;
        } else {
          offsetBeforeNode += currentPiece.length;
          if (i === 0) {
            offsetBeforeNode += currentPiece.paddingLeft;
          }
        }
      }
      const offsetBeforeWordInNode = this.range.startOffset + this._pieces[0].paddingLeft - offsetBeforeNode;
      if (offsetBeforeWordInNode <= 0) {
        return 0;
      }
      const words = (piece.node.nodeValue || "").split(TTSUtil.getSplitWordRegex());
      let currentWordStartOffset = 0;
      for (let j = 0; j < words.length; j += 1) {
        if (currentWordStartOffset >= offsetBeforeWordInNode) {
          return j;
        }
        currentWordStartOffset += words[j].trim().length + 1;
      }
      return words.length - 1;
    }
    /**
     * @returns {Number}
     */
    getEndWordIndex() {
      const piece = this.getEndWordPiece();
      const firstPaddingLeft = this._pieces[0].paddingLeft;
      let offsetBeforeNode = 0;
      for (let i = 0; i < this._pieces.length; i += 1) {
        const currentPiece = this._pieces[i];
        if (currentPiece.nodeIndex >= piece.nodeIndex) {
          break;
        } else {
          offsetBeforeNode += currentPiece.length;
          if (i === 0) {
            offsetBeforeNode += firstPaddingLeft;
          }
        }
      }
      const offsetAfterEndWordInNode = this.range.endOffset + firstPaddingLeft - offsetBeforeNode;
      const words = (piece.node.nodeValue || "").split(TTSUtil.getSplitWordRegex());
      let currentWordEndOffset = 0;
      for (let j = 0; j < words.length; j += 1) {
        currentWordEndOffset += words[j].length + 1;
        if (currentWordEndOffset >= offsetAfterEndWordInNode) {
          return j;
        }
      }
      return words.length - 1;
    }
    /**
     * @param {Boolean} removeBlank
     * @returns {MutableClientRect[]}
     */
    getClientRects(removeBlank) {
      const chunkRange = this.range;
      const pieces = this._pieces;
      let rects = [];
      let start = 0;
      let end = 0;
      let current = 0;
      let totalLength = 0;
      for (let i = 0; i < pieces.length; i += 1, current += totalLength) {
        const piece = pieces[i];
        const { node } = piece;
        const range = document.createRange();
        range.selectNodeContents(node);
        if (piece.isInvalid()) {
          totalLength = 0;
          rects.push(range.getAdjustedBoundingClientRect());
        } else {
          totalLength = piece.length;
          const pieceRange = new TTSRange(current, current + piece.length);
          if (chunkRange.startOffset <= pieceRange.startOffset) {
            if (pieceRange.endOffset <= chunkRange.endOffset) {
              start = pieceRange.startOffset;
              end = pieceRange.endOffset;
            } else if (chunkRange.endOffset <= pieceRange.startOffset) {
              continue;
            } else {
              start = pieceRange.startOffset;
              end = chunkRange.endOffset;
            }
          } else if (chunkRange.endOffset <= pieceRange.endOffset) {
            start = chunkRange.startOffset;
            end = chunkRange.endOffset;
          } else if (pieceRange.endOffset <= chunkRange.startOffset) {
            continue;
          } else {
            start = chunkRange.startOffset;
            end = pieceRange.endOffset;
          }
          start = Math.max(start - current + piece.paddingLeft, 0);
          end = Math.max(end - current + piece.paddingLeft, 0);
          if (end === 0) {
            end = totalLength;
          }
          try {
            range.setStart(node, start);
            range.setEnd(node, end);
            range.expand("character");
          } catch (e) {
            console.error(
              `TSChunk:getClientRects() Error!! ${e.toString()}
 => {startOffset: ${start}, endOffset: ${end}, offset: ${current}, nodeIndex: ${piece.nodeIndex}, startWordIndex: ${piece.startWordIndex}, endWordIndex: ${piece.endWordIndex}}`
            );
          }
          if (removeBlank === true && range.toString().length === 0) {
            continue;
          }
          rects = _Util.concatArray(rects, range.getAdjustedClientRects());
        }
      }
      return rects;
    }
    /**
     * @param {TTSRange} range
     * @returns {TTSChunk}
     */
    copy(range) {
      return new _TTSChunk(this._pieces, range);
    }
  };

  // vendor-src/ridi/src/common/tts/_TTS.es6
  var _TTS = class {
    /**
     * @returns {Reader}
     */
    get reader() {
      return this._reader;
    }
    /**
     * @returns {Node[]}
     */
    get nodes() {
      return this.reader.content.nodes;
    }
    /**
     * @returns {TTSChunk[]}
     */
    get chunks() {
      return this._chunks;
    }
    /**
     * @returns {Number}
     */
    get reserveNodesCountMagic() {
      return this._reserveNodesCountMagic;
    }
    /**
     * @returns {Number}
     */
    get makeChunksInterval() {
      return this._makeChunksInterval;
    }
    /**
     * @returns {Number}
     */
    get processedNodeMinIndex() {
      return this._processedNodeMinIndex;
    }
    /**
     * @returns {Number}
     */
    get processedNodeMaxIndex() {
      return this._processedNodeMaxIndex;
    }
    /**
     * @returns {Boolean}
     */
    get didFinishMakeChunksEnabled() {
      return this._didFinishMakeChunksEnabled;
    }
    /**
     * @param {Reader} reader
     */
    constructor(reader) {
      this._reader = reader;
      this.debug = false;
      this._reserveNodesCountMagic = 40;
      this._makeChunksInterval = 100;
      this._processedNodeMinIndex = -1;
      this._processedNodeMaxIndex = -1;
      this._generateMoreChunksTimeoutId = 0;
      this._didFinishMakeChunksEnabled = false;
      this._chunks = [];
    }
    /**
     * @param {String} serializedRange
     * @returns {{nodeIndex: Number, wordIndex: Number}}
     * @private
     */
    _serializedRangeToNodeLocation(serializedRange) {
      const range = rangy.deserializeRange(serializedRange, document.body);
      if (range === null) {
        throw new Error("TTS: range is invalid.");
      }
      const { nodes } = this;
      let nodeIndex = -1;
      let wordIndex = 0;
      if (nodes) {
        for (let i = 0, offset = 0; i < nodes.length; i += 1, offset = 0) {
          if (nodes[i] === range.startContainer) {
            nodeIndex = i;
            const words = range.startContainer.textContent.split(TTSUtil.getSplitWordRegex());
            for (; wordIndex < words.length; wordIndex += 1) {
              if (range.startOffset <= offset + words[wordIndex].length) {
                break;
              } else {
                offset += words[wordIndex].length + 1;
              }
            }
            break;
          }
        }
      }
      return { nodeIndex, wordIndex };
    }
    /**
     * @param {String} serializedRange
     */
    playChunksBySerializedRange(serializedRange) {
      const nodeLocation = this._serializedRangeToNodeLocation(serializedRange);
      this.playChunksByNodeLocation(nodeLocation.nodeIndex, nodeLocation.wordIndex);
    }
    /**
     * @param {Number} nodeIndex
     * @param {Number} wordIndex
     */
    playChunksByNodeLocation(nodeIndex, wordIndex) {
      this.makeChunksByNodeLocation(nodeIndex, wordIndex, true);
      if (this.chunks.length === 0) {
        this.makeChunksByNodeLocationReverse(nodeIndex, wordIndex, true);
      }
      if (this.chunks.length > 0) {
        this._chunks = [this.chunks[0]];
        this.didFinishMakePartialChunks(true, false);
      } else {
        this.didFinishMakeChunks();
      }
    }
    makeLastSentenceChunksInSpine() {
      this.makeChunksByNodeLocationReverse(-1, -1, true);
      const emptyChunkRegex = TTSUtil.getWhitespaceAndNewLineRegex("^", "$", null);
      let lastSentenceChunk = null;
      for (let i = this.chunks.length - 1; i >= 0; i -= 1) {
        lastSentenceChunk = this.chunks[i];
        if (lastSentenceChunk.getUtterance().text.match(emptyChunkRegex)) {
          lastSentenceChunk = null;
        } else {
          break;
        }
      }
      if (lastSentenceChunk) {
        this._chunks = [];
        this.makeAdjacentChunksByNodeLocation(
          lastSentenceChunk.getStartNodeIndex(),
          lastSentenceChunk.getStartWordIndex()
        );
      } else {
        this._didFinishMakeChunksEnabled = true;
        this.didFinishMakeChunks();
      }
    }
    /**
     * @param {String} serializedRange
     */
    makeAdjacentChunksBySerializedRange(serializedRange) {
      const nodeLocation = this._serializedRangeToNodeLocation(serializedRange);
      this.makeAdjacentChunksByNodeLocation(nodeLocation.nodeIndex, nodeLocation.wordIndex);
    }
    /**
     * @param {Number} nodeIndex
     * @param {Number} wordIndex
     */
    makeAdjacentChunksByNodeLocation(nodeIndex = -1, wordIndex = -1) {
      this._didFinishMakeChunksEnabled = true;
      this.makeChunksByNodeLocation(nodeIndex, wordIndex);
      this.chunks.shift();
      const firstChunk = this.chunks[0];
      let endNodeIndex = -1;
      let endWordIndex = -1;
      if (firstChunk) {
        endNodeIndex = firstChunk.getStartNodeIndex();
        endWordIndex = firstChunk.getStartWordIndex() - 1;
        if (endWordIndex < 0) {
          endNodeIndex -= 1;
        }
      }
      this.makeChunksByNodeLocationReverse(endNodeIndex, endWordIndex);
      this.didFinishMakePartialChunks(false, false);
      this.playChunksByNodeLocation(nodeIndex, wordIndex);
      const { nodes } = this;
      if (!nodes) {
        return;
      }
      const hasMoreAfterChunks = () => this.processedNodeMaxIndex + 1 < nodes.length;
      const hasMoreBeforeChunks = () => this.processedNodeMinIndex - 1 >= 0;
      let generateMoreChunks = () => {
      };
      const scheduleTask = () => {
        if (hasMoreAfterChunks() || hasMoreBeforeChunks()) {
          const timeoutId = this._generateMoreChunksTimeoutId;
          if (this.makeChunksInterval > 0) {
            setTimeout(() => generateMoreChunks(timeoutId), this.makeChunksInterval);
          } else {
            generateMoreChunks(timeoutId);
          }
        } else {
          this.didFinishMakeChunks();
        }
      };
      generateMoreChunks = (timeoutId) => {
        if (timeoutId !== this._generateMoreChunksTimeoutId) {
          return;
        }
        if (hasMoreAfterChunks()) {
          this.makeChunksByNodeLocation(this.processedNodeMaxIndex + 1);
          this.didFinishMakePartialChunks(false, false);
        }
        if (hasMoreBeforeChunks()) {
          this.makeChunksByNodeLocationReverse(this.processedNodeMinIndex - 1);
          this.didFinishMakePartialChunks(false, true);
        }
        scheduleTask();
      };
      scheduleTask();
    }
    /**
     * @param {Number} nodeIndex
     * @param {Number} wordIndex
     * @param {Boolean} isMakingTemporalChunk : Selection 듣기 등 온전하지 못한 문장을 위한 임시 Chunk 1개를 만드는 경우이다.
     * @returns {Number}
     */
    makeChunksByNodeLocation(nodeIndex = -1, wordIndex = -1, isMakingTemporalChunk = false) {
      const { nodes } = this;
      if (nodes === null) {
        return 0;
      }
      let _nodeIndex = Math.max(nodeIndex, 0);
      let _wordIndex = Math.max(wordIndex, 0);
      const reserveNodesCount = isMakingTemporalChunk ? 0 : this.reserveNodesCountMagic;
      let maxIndex = Math.min(_nodeIndex + reserveNodesCount, nodes.length - 1);
      const incrementMaxIndex = () => {
        maxIndex = Math.min(maxIndex + 1, nodes.length - 1);
      };
      let pieceBuffer = [];
      const flushPieces = () => {
        this._addChunk(pieceBuffer, false);
        pieceBuffer = [];
      };
      for (; _nodeIndex <= maxIndex + 1; _nodeIndex += 1, _wordIndex = -1) {
        if (_nodeIndex >= nodes.length) {
          flushPieces();
          break;
        }
        let piece;
        try {
          piece = new TTSPiece(nodes[_nodeIndex], _nodeIndex, _wordIndex);
        } catch (e) {
          console.error(e);
          break;
        }
        const aboveMaxIndex = _nodeIndex > maxIndex;
        if (piece.isInvalid()) {
          if (!aboveMaxIndex) {
            incrementMaxIndex();
          }
        } else if (piece.isOnlyWhitespace()) {
          flushPieces();
          if (!aboveMaxIndex) {
            incrementMaxIndex();
          }
        } else if (!aboveMaxIndex && piece.isSiblingBrRecursive(true)) {
          pieceBuffer.push(piece);
          flushPieces();
        } else {
          if (!aboveMaxIndex) {
            pieceBuffer.push(piece);
          }
          if (!aboveMaxIndex && piece.length > 1 && piece.isSentence()) {
            flushPieces();
          } else if (_nodeIndex >= maxIndex) {
            incrementMaxIndex();
            if (aboveMaxIndex) {
              _nodeIndex -= 1;
            }
          }
        }
      }
      if (!isMakingTemporalChunk) {
        this._processedNodeMaxIndex = maxIndex;
      }
      return this.chunks.length;
    }
    /**
     * @param {Number} nodeIndex
     * @param {Number} wordIndex
     * @param {Boolean} isMakingTemporalChunk
     * @returns {Boolean}
     */
    makeChunksByNodeLocationReverse(nodeIndex = -1, wordIndex = -1, isMakingTemporalChunk = false) {
      const { nodes } = this;
      if (nodes === null) {
        return 0;
      }
      const wordsInNode = (node) => node ? (node.nodeValue || "").split(TTSUtil.getSplitWordRegex()) : [];
      const maxNodeIndex = nodes.length - 1;
      let _nodeIndex = nodeIndex >= 0 ? Math.min(nodeIndex, maxNodeIndex) : maxNodeIndex;
      const maxWordIndex = wordsInNode(nodes[_nodeIndex]).length - 1;
      let startWordIndex = 0;
      let endWordIndex = wordIndex >= 0 ? Math.min(wordIndex, maxWordIndex) : maxWordIndex;
      const reserveNodesCount = isMakingTemporalChunk ? 0 : this.reserveNodesCountMagic;
      let minIndex = Math.max(0, _nodeIndex - reserveNodesCount);
      const decrementMinIndex = () => {
        minIndex = Math.max(minIndex - 1, 0);
      };
      let pieceBuffer = [];
      const flushPieces = () => {
        this._addChunk(pieceBuffer, true);
        pieceBuffer = [];
      };
      const initMinIndex = minIndex;
      for (; _nodeIndex >= minIndex - 1; _nodeIndex -= 1, startWordIndex = -1, endWordIndex = -1) {
        if (_nodeIndex < 0) {
          flushPieces();
          break;
        }
        let piece;
        try {
          piece = new TTSPiece(nodes[_nodeIndex], _nodeIndex, startWordIndex, endWordIndex);
        } catch (e) {
          console.error(e);
          break;
        }
        const belowMinIndex = _nodeIndex < minIndex;
        if (piece.isInvalid()) {
          if (!belowMinIndex) {
            decrementMinIndex();
          }
        } else if (piece.isOnlyWhitespace()) {
          flushPieces();
          if (!belowMinIndex) {
            decrementMinIndex();
          }
        } else if (!belowMinIndex && piece.isSiblingBrRecursive(false)) {
          pieceBuffer.unshift(piece);
          flushPieces();
        } else {
          const isCurrentPieceSentence = piece.length > 1 && piece.isSentence();
          if (isCurrentPieceSentence) {
            flushPieces();
            if (_nodeIndex < initMinIndex && this.chunks.length > 0) {
              minIndex = _nodeIndex + 1;
              break;
            }
          }
          if (belowMinIndex) {
            if (!isCurrentPieceSentence) {
              decrementMinIndex();
              _nodeIndex += 1;
            }
          } else {
            pieceBuffer.unshift(piece);
            if (_nodeIndex === minIndex) {
              decrementMinIndex();
            }
          }
        }
      }
      if (!isMakingTemporalChunk) {
        this._processedNodeMinIndex = minIndex;
      }
      return this.chunks.length;
    }
    /**
     * makeChunksByNodeLocation(Reverse)를 1회 실행한 후 불리는 method
     *
     * @param {Boolean} isMakingTemporalChunk
     * @param {Boolean} addAtFirst
     */
    didFinishMakePartialChunks() {
      throw new Error("Must override this method");
    }
    /**
     * 모든 chunk를 이미 다 만들었을 때, 즉 새로운 chunk를 만들지 못했을 때 불리는 method
     *
     * @returns {Boolean}
     */
    didFinishMakeChunks() {
      if (this.didFinishMakeChunksEnabled) {
        this._didFinishMakeChunksEnabled = false;
        return true;
      }
      return false;
    }
    /**
     * @param {TTSPiece[]} pieces
     * @param {Boolean} addAtFirst
     * @private
     */
    _addChunk(pieces, addAtFirst) {
      if (pieces.length === 0) {
        return;
      }
      const RIDI = "RidiDelimiter";
      const split = (text) => text.replace(/([.。?!])/gm, `$1[${RIDI}]`).split(`[${RIDI}]`).filter((splitText) => splitText.trim().length > 0);
      const isNotEndOfSentence = (nextText) => nextText !== void 0 && nextText.match(TTSUtil.getSentenceRegex("^")) !== null;
      const debug = (caseNum, chunk2) => {
        if (this.debug && chunk2) {
          console.log(`Case: ${caseNum}, Text: ${chunk2.getText()}`);
        }
      };
      const makeTrimmedRange = (startOffset, text) => {
        const paddingLeft = (text.match(/^([\s]+)/g) || [""])[0].length;
        const paddingRight = (text.match(/([\s]+)$/g) || [""])[0].length;
        return new TTSRange(startOffset + paddingLeft, startOffset + text.length - paddingRight);
      };
      const buffer = [];
      const pushToChunks = (chunk2) => {
        if (addAtFirst) {
          buffer.push(chunk2);
        } else {
          this.chunks.push(chunk2);
        }
        return chunk2;
      };
      const chunk = new TTSChunk(pieces);
      const tokens = TTSUtil.mergeSentencesWithinBrackets(split(chunk.getText()));
      if (tokens.length > 1) {
        let offset = 0;
        let startOffset = 0;
        let subText = "";
        for (let i = 0; i < tokens.length; i += 1) {
          const token = tokens[i];
          subText += token;
          offset += token.length;
          if (TTSUtil.isPeriodPointOrName(subText, tokens[i + 1]) || isNotEndOfSentence(tokens[i + 1])) {
            continue;
          }
          if (subText.length) {
            debug(1, pushToChunks(chunk.copy(makeTrimmedRange(startOffset, subText))));
            subText = "";
          }
          startOffset = offset;
        }
        if (subText.length) {
          debug(2, pushToChunks(chunk.copy(makeTrimmedRange(startOffset, subText))));
        }
      } else if (tokens.length === 1) {
        debug(3, pushToChunks(chunk.copy(makeTrimmedRange(0, tokens[0]))));
      }
      if (addAtFirst) {
        while (buffer.length > 0) {
          this.chunks.unshift(buffer.pop());
        }
      }
    }
    flush() {
      this._processedNodeMinIndex = -1;
      this._processedNodeMaxIndex = -1;
      this._generateMoreChunksTimeoutId += 1;
      this._didFinishMakeChunksEnabled = false;
      this._chunks = [];
    }
  };

  // vendor-src/ridi/src/android/TTS.es6
  var TTS = class extends _TTS {
    /**
     * @param {Boolean} isMakingTemporalChunk
     * @param {Boolean} addAtFirst
     */
    didFinishMakePartialChunks(isMakingTemporalChunk, addAtFirst) {
      while (this.chunks.length > 0) {
        const chunk = addAtFirst ? this.chunks.pop() : this.chunks.shift();
        android.onUtteranceFound(
          chunk.getStartNodeIndex(),
          chunk.getStartWordIndex(),
          chunk.getUtterance().text,
          this.reader.rectsToAbsoluteCoord(chunk.getClientRects(true)),
          isMakingTemporalChunk,
          addAtFirst
        );
      }
    }
    didFinishMakeChunks() {
      if (super.didFinishMakeChunks()) {
        android.onFinishMakeChunks();
      }
    }
  };

  // vendor-src/ridi/src/android/index.es6
  var index_default = {
    Context,
    Reader,
    Util,
    TTS,
    TTSUtil,
    TTSUtterance
  };
  return __toCommonJS(index_exports);
})();

;
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

;
// Production steps of ECMA-262, Edition 6, 22.1.2.1
if (!Array.from) {
    Array.from = (function () {
      var toStr = Object.prototype.toString;
      var isCallable = function (fn) {
        return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
      };
      var toInteger = function (value) {
        var number = Number(value);
        if (isNaN(number)) { return 0; }
        if (number === 0 || !isFinite(number)) { return number; }
        return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
      };
      var maxSafeInteger = Math.pow(2, 53) - 1;
      var toLength = function (value) {
        var len = toInteger(value);
        return Math.min(Math.max(len, 0), maxSafeInteger);
      };
  
      // The length property of the from method is 1.
      return function from(arrayLike/*, mapFn, thisArg */) {
        // 1. Let C be the this value.
        var C = this;
  
        // 2. Let items be ToObject(arrayLike).
        var items = Object(arrayLike);
  
        // 3. ReturnIfAbrupt(items).
        if (arrayLike == null) {
          throw new TypeError('Array.from requires an array-like object - not null or undefined');
        }
  
        // 4. If mapfn is undefined, then let mapping be false.
        var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
        var T;
        if (typeof mapFn !== 'undefined') {
          // 5. else
          // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
          if (!isCallable(mapFn)) {
            throw new TypeError('Array.from: when provided, the second argument must be a function');
          }
  
          // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
          if (arguments.length > 2) {
            T = arguments[2];
          }
        }
  
        // 10. Let lenValue be Get(items, "length").
        // 11. Let len be ToLength(lenValue).
        var len = toLength(items.length);
  
        // 13. If IsConstructor(C) is true, then
        // 13. a. Let A be the result of calling the [[Construct]] internal method 
        // of C with an argument list containing the single item len.
        // 14. a. Else, Let A be ArrayCreate(len).
        var A = isCallable(C) ? Object(new C(len)) : new Array(len);
  
        // 16. Let k be 0.
        var k = 0;
        // 17. Repeat, while k < len… (also steps a - h)
        var kValue;
        while (k < len) {
          kValue = items[k];
          if (mapFn) {
            A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
          } else {
            A[k] = kValue;
          }
          k += 1;
        }
        // 18. Let putStatus be Put(A, "length", len, true).
        A.length = len;
        // 20. Return A.
        return A;
      };
    }());
  }
;
/* jshint ignore:start */

// https://www.chromestatus.com/features/4606972603138048
// https://gist.github.com/darrnshn/addeabe2575177342cc6242e20ecadbd
// polyfill window.getMatchedCSSRules() in Chrome
if ( typeof window.getMatchedCSSRules !== 'function' ) {
  var ELEMENT_RE = /[\w-]+/g,
    ID_RE = /#[\w-]+/g,
    CLASS_RE = /\.[\w-]+/g,
    ATTR_RE = /\[[^\]]+\]/g,
    // :not() pseudo-class does not add to specificity, but its content does as if it was outside it
    PSEUDO_CLASSES_RE = /\:(?!not)[\w-]+(\(.*\))?/g,
    PSEUDO_ELEMENTS_RE = /\:\:?(after|before|first-letter|first-line|selection)/g;
  // convert an array-like object to array
  function toArray (list) {
    return [].slice.call(list || []);
  }

  // handles extraction of `cssRules` as an `Array` from a stylesheet or something that behaves the same
  function getSheetRules (stylesheet) {
    var sheet_media = stylesheet.media && stylesheet.media.mediaText;
    // if this sheet is disabled skip it
    if ( stylesheet.disabled ) return [];
    // if this sheet's media is specified and doesn't match the viewport then skip it
    if ( sheet_media && sheet_media.length && ! window.matchMedia(sheet_media).matches ) return [];
    // get the style rules of this sheet
    return toArray(stylesheet.cssRules);
  }

  function _find (string, re) {
    var matches = string.match(re);
    return re ? re.length : 0;
  }

  // calculates the specificity of a given `selector`
  function calculateScore (selector) {
    var score = [0,0,0],
      parts = selector.split(' '),
      part, match;
    //TODO: clean the ':not' part since the last ELEMENT_RE will pick it up
    while ( part = parts.shift(), typeof part == 'string' ) {
      // find all pseudo-elements
      match = _find(part, PSEUDO_ELEMENTS_RE);
      score[2] = match;
      // and remove them
      match && (part = part.replace(PSEUDO_ELEMENTS_RE, ''));
      // find all pseudo-classes
      match = _find(part, PSEUDO_CLASSES_RE);
      score[1] = match;
      // and remove them
      match && (part = part.replace(PSEUDO_CLASSES_RE, ''));
      // find all attributes
      match = _find(part, ATTR_RE);
      score[1] += match;
      // and remove them
      match && (part = part.replace(ATTR_RE, ''));
      // find all IDs
      match = _find(part, ID_RE);
      score[0] = match;
      // and remove them
      match && (part = part.replace(ID_RE, ''));
      // find all classes
      match = _find(part, CLASS_RE);
      score[1] += match;
      // and remove them
      match && (part = part.replace(CLASS_RE, ''));
      // find all elements
      score[2] += _find(part, ELEMENT_RE);
    }
    return parseInt(score.join(''), 10);
  }

  // returns the heights possible specificity score an element can get from a give rule's selectorText
  function getSpecificityScore (element, selector_text) {
    var selectors = selector_text.split(','),
      selector, score, result = 0;
    while ( selector = selectors.shift() ) {
      if ( element.webkitMatchesSelector(selector) ) {
        score = calculateScore(selector);
        result = score > result ? score : result;
      }
    }
    return result;
  }

  function sortBySpecificity (element, rules) {
    // comparing function that sorts CSSStyleRules according to specificity of their `selectorText`
    function compareSpecificity (a, b) {
      return getSpecificityScore(element, b.selectorText) - getSpecificityScore(element, a.selectorText);
    }

    return rules.sort(compareSpecificity);
  }

  //TODO: not supporting 2nd argument for selecting pseudo elements
  //TODO: not supporting 3rd argument for checking author style sheets only
  window.getMatchedCSSRules = function (element /*, pseudo, author_only*/) {
    var style_sheets, sheet, sheet_media,
      rules, rule,
      result = [];
    // get stylesheets and convert to a regular Array
    style_sheets = toArray(window.document.styleSheets);

    // assuming the browser hands us stylesheets in order of appearance
    // we iterate them from the beginning to follow proper cascade order
    while ( sheet = style_sheets.shift() ) {
      // get the style rules of this sheet
      rules = getSheetRules(sheet);
      // loop the rules in order of appearance
      while ( rule = rules.shift() ) {
        // if this is an @import rule
        if ( rule.styleSheet ) {
          // insert the imported stylesheet's rules at the beginning of this stylesheet's rules
          rules = getSheetRules(rule.styleSheet).concat(rules);
          // and skip this rule
          continue;
        }
        // if there's no stylesheet attribute BUT there IS a media attribute it's a media rule
        else if ( rule.media ) {
          // insert the contained rules of this media rule to the beginning of this stylesheet's rules
          rules = getSheetRules(rule).concat(rules);
          // and skip it
          continue;
        }
        else if ( !rule.selectorText || rule.selectorText.length === 0 ) {
          continue;
        }
        //TODO: for now only polyfilling Gecko
        // check if this element matches this rule's selector
        if ( element.webkitMatchesSelector(rule.selectorText) ) {
          // push the rule to the results set
          result.push(rule);
        }
      }
    }
    // sort according to specificity
    return sortBySpecificity(element, result);
  };
}

/* jshint ignore:end */

;
// requestIdleCallback.js (v0.3.0 Base)

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    window.idleCallbackShim = factory();
  }
}(function(){
  'use strict';
  var scheduleStart, throttleDelay, lazytimer, lazyraf;
  var root = typeof window != 'undefined' ?
    window :
    typeof global != undefined ?
      global :
      this || {};
  var requestAnimationFrame = root.cancelRequestAnimationFrame && root.requestAnimationFrame || setTimeout;
  var cancelRequestAnimationFrame = root.cancelRequestAnimationFrame || clearTimeout;
  var tasks = [];
  var runAttempts = 0;
  var isRunning = false;
  var remainingTime = 7;
  var minThrottle = 35;
  var throttle = 125;
  var index = 0;
  var taskStart = 0;
  var tasklength = 0;
  var IdleDeadline = {
    get didTimeout(){
      return false;
    },
    timeRemaining: function(){
      var timeRemaining = remainingTime - (Date.now() - taskStart);
      return timeRemaining < 0 ? 0 : timeRemaining;
    },
  };
  var setInactive = debounce(function(){
    remainingTime = 22;
    throttle = 66;
    minThrottle = 0;
  });

  function debounce(fn){
    var id, timestamp;
    var wait = 99;
    var check = function(){
      var last = (Date.now()) - timestamp;

      if (last < wait) {
        id = setTimeout(check, wait - last);
      } else {
        id = null;
        fn();
      }
    };
    return function(){
      timestamp = Date.now();
      if(!id){
        id = setTimeout(check, wait);
      }
    };
  }

  function abortRunning(){
    if(isRunning){
      if(lazyraf){
        cancelRequestAnimationFrame(lazyraf);
      }
      if(lazytimer){
        clearTimeout(lazytimer);
      }
      isRunning = false;
    }
  }

  function onInputorMutation(){
    if(throttle != 125){
      remainingTime = 7;
      throttle = 125;
      minThrottle = 35;

      if(isRunning) {
        abortRunning();
        scheduleLazy();
      }
    }
    setInactive();
  }

  function scheduleAfterRaf() {
    lazyraf = null;
    lazytimer = setTimeout(runTasks, 0);
  }

  function scheduleRaf(){
    lazytimer = null;
    requestAnimationFrame(scheduleAfterRaf);
  }

  function scheduleLazy(){

    if(isRunning){return;}
    throttleDelay = throttle - (Date.now() - taskStart);

    scheduleStart = Date.now();

    isRunning = true;

    if(minThrottle && throttleDelay < minThrottle){
      throttleDelay = minThrottle;
    }

    if(throttleDelay > 9){
      lazytimer = setTimeout(scheduleRaf, throttleDelay);
    } else {
      throttleDelay = 0;
      scheduleRaf();
    }
  }

  function runTasks(){
    var task, i, len;
    var timeThreshold = remainingTime > 9 ?
      9 :
      1
    ;

    taskStart = Date.now();
    isRunning = false;

    lazytimer = null;

    if(runAttempts > 2 || taskStart - throttleDelay - 50 < scheduleStart){
      for(i = 0, len = tasks.length; i < len && IdleDeadline.timeRemaining() > timeThreshold; i++){
        task = tasks.shift();
        tasklength++;
        if(task){
          task(IdleDeadline);
        }
      }
    }

    if(tasks.length){
      scheduleLazy();
    } else {
      runAttempts = 0;
    }
  }

  function requestIdleCallbackShim(task){
    index++;
    tasks.push(task);
    scheduleLazy();
    return index;
  }

  function cancelIdleCallbackShim(id){
    var index = id - 1 - tasklength;
    if(tasks[index]){
      tasks[index] = null;
    }
  }

  if(!root.requestIdleCallback || !root.cancelIdleCallback){
    root.requestIdleCallback = requestIdleCallbackShim;
    root.cancelIdleCallback = cancelIdleCallbackShim;

    if(root.document && document.addEventListener){
      root.addEventListener('scroll', onInputorMutation, true);
      root.addEventListener('resize', onInputorMutation);

      document.addEventListener('focus', onInputorMutation, true);
      document.addEventListener('mouseover', onInputorMutation, true);
      ['click', 'keypress', 'touchstart', 'mousedown'].forEach(function(name){
        document.addEventListener(name, onInputorMutation, {capture: true, passive: true});
      });

      if(root.MutationObserver){
        new MutationObserver( onInputorMutation ).observe( document.documentElement, {childList: true, subtree: true, attributes: true} );
      }
    }
  } else {
    try{
      root.requestIdleCallback(function(){}, {timeout: 0});
    } catch(e){
      (function(rIC){
        var timeRemainingProto, timeRemaining;
        root.requestIdleCallback = function(fn, timeout){
          if(timeout && typeof timeout.timeout == 'number'){
            return rIC(fn, timeout.timeout);
          }
          return rIC(fn);
        };
        if(root.IdleCallbackDeadline && (timeRemainingProto = IdleCallbackDeadline.prototype)){
          timeRemaining = Object.getOwnPropertyDescriptor(timeRemainingProto, 'timeRemaining');
          if(!timeRemaining || !timeRemaining.configurable || !timeRemaining.get){return;}
          Object.defineProperty(timeRemainingProto, 'timeRemaining', {
            value:  function(){
              return timeRemaining.get.call(this);
            },
            enumerable: true,
            configurable: true,
          });
        }
      })(root.requestIdleCallback);
    }
  }

  return {
    request: requestIdleCallbackShim,
    cancel: cancelIdleCallbackShim,
  };
}));

;
// assign.js (v0.3.0 Base)

// https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      // 우리는 반드시 특정한 케이스에 대해서 확인해야 합니다.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

;
// rangy.js (v1.3alpha.804 Base)

// Checksum for checking whether range can be serialized
var crc32 = (function() {
    function utf8encode(str) {
        var utf8CharCodes = [];

        for (var i = 0, len = str.length, c; i < len; ++i) {
            c = str.charCodeAt(i);
            if (c < 128) {
                utf8CharCodes.push(c);
            } else if (c < 2048) {
                utf8CharCodes.push((c >> 6) | 192, (c & 63) | 128);
            } else {
                utf8CharCodes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
            }
        }
        return utf8CharCodes;
    }

    var cachedCrcTable = null;

    function buildCRCTable() {
        var table = [];
        for (var i = 0, j, crc; i < 256; ++i) {
            crc = i;
            j = 8;
            while (j--) {
                if ((crc & 1) == 1) {
                    crc = (crc >>> 1) ^ 0xEDB88320;
                } else {
                    crc >>>= 1;
                }
            }
            table[i] = crc >>> 0;
        }
        return table;
    }

    function getCrcTable() {
        if (!cachedCrcTable) {
            cachedCrcTable = buildCRCTable();
        }
        return cachedCrcTable;
    }

    return function(str) {
        var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
        for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
            y = (crc ^ utf8CharCodes[i]) & 0xFF;
            crc = (crc >>> 8) ^ crcTable[y];
        }
        return (crc ^ -1) >>> 0;
    };
})();

var rangy = {
    nodeToInfoString: function(node, infoParts) {
        var escapeTextForHtml = function(str) {
            return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        };

        infoParts = infoParts || [];
        var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
        var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
        var start = "", end = "";
        switch (nodeType) {
            case 3: // Text node
                start = escapeTextForHtml(node.nodeValue);
                break;
            case 8: // Comment
                start = "<!--" + escapeTextForHtml(node.nodeValue) + "-->";
                break;
            default:
                start = "<" + nodeInfo + ">";
                end = "</>";
                break;
        }
        if (start) {
            infoParts.push(start);
        }
        for (var i = 0; i < childCount; ++i) {
            rangy.nodeToInfoString(children[i], infoParts);
        }
        if (end) {
            infoParts.push(end);
        }
        return infoParts;
    },

    // Creates a string representation of the specified element's contents that is similar to innerHTML but omits all
    // attributes and comments and includes child node counts. This is done instead of using innerHTML to work around
    // IE <= 8's policy of including element properties in attributes, which ruins things by changing an element's
    // innerHTML whenever the user changes an input within the element.
    getElementChecksum: function(el) {
        var info = rangy.nodeToInfoString(el).join("");
        return crc32(info).toString(16);
    },

    getDocument: function(node) {
        if (node.nodeType == 9) {
            return node;
        } else if (typeof node.ownerDocument != 'undefined') {
            return node.ownerDocument;
        } else if (typeof node.document != 'undefined') {
            return node.document;
        } else if (node.parentNode) {
            return rangy.getDocument(node.parentNode);
        } else {
            throw new Error("Error in Rangy: getDocument: no document found for node");
        }
    },

    getNodeIndex: function(node) {
        var i = 0;
        while( (node = node.previousSibling) ) {
            ++i;
        }
        return i;
    },

    getNodeLength: function(node) {
        switch (node.nodeType) {
            case 7:
            case 10:
                return 0;
            case 3:
            case 8:
                return node.length;
            default:
                return node.childNodes.length;
        }
    },

    serializePosition: function(node, offset, rootNode) {
        var pathParts = [], n = node;
        rootNode = rootNode || rangy.getDocument(node).documentElement;
        while (n && n != rootNode) {
            pathParts.push(rangy.getNodeIndex(n, true));
            n = n.parentNode;
        }
        return pathParts.join("/") + ":" + offset;
    },

    serializeRange: function(range, omitChecksum, rootNode) {
        var isOrIsAncestorOf = function(ancestor, descendant, selfIsAncestor) {
            var n = selfIsAncestor ? descendant : descendant.parentNode;
            while (n) {
                if (n === ancestor) {
                    return true;
                } else {
                    n = n.parentNode;
                }
            }
            return false;
        };

        rootNode = rootNode || rangy.getDocument(range).startContainer;
        if (!isOrIsAncestorOf(rootNode, range.commonAncestorContainer, true)) {
            throw new Error("Error in Rangy: serializeRange(): range is not wholly contained within specified root node.");
        }
        var serialized = rangy.serializePosition(range.startContainer, range.startOffset, rootNode) + "," +
                         rangy.serializePosition(range.endContainer, range.endOffset, rootNode);
        if (!omitChecksum) {
            serialized += "{" + rangy.getElementChecksum(rootNode) + "}";
        }
        return serialized;
    },

    deserializePosition: function(serialized, rootNode, doc) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var parts = serialized.split(":");
        var node = rootNode;
        var nodeIndices = parts[0] ? parts[0].split("/") : [], i = nodeIndices.length, nodeIndex;

        while (i--) {
            nodeIndex = parseInt(nodeIndices[i], 10);
            if (nodeIndex < node.childNodes.length) {
                node = node.childNodes[nodeIndex];
            } else {
                throw new Error("Error in Rangy: deserializePosition() failed: node has no child with index " + nodeIndex + ", " + i + ".");
            }
        }

        return {node: node, offset: parseInt(parts[1], 10)};
    },
    
    deserializeRegex: /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/,

    deserializeRange: function(serialized, rootNode, doc) {
        if (rootNode) {
            doc = doc || rangy.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var result = rangy.deserializeRegex.exec(serialized);
        var checksum = result[4], rootNodeChecksum;
        if (checksum) {
            rootNodeChecksum = rangy.getElementChecksum(rootNode);
            if (checksum !== rootNodeChecksum) {
                throw new Error("deserializeRange: checksums of serialized range root node (" + checksum +
                    ") and target root node (" + rootNodeChecksum + ") do not match");
            }
        }
        var start = rangy.deserializePosition(result[1], rootNode, doc), end = rangy.deserializePosition(result[2], rootNode, doc);
        var range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        return range;
    },

    canDeserializeRange: function(serialized, rootNode, doc) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var result = rangy.deserializeRegex.exec(serialized);
        var checksum = result[3];
        return !checksum || checksum === rangy.getElementChecksum(rootNode);
    },

};
