const vcms = require('visual-cms.core');
const CodeMirror = require('codemirror/lib/codemirror');
require('codemirror/mode/htmlmixed/htmlmixed');
require('../styles/vcms.scss');

(function () {
  angular.module('vcms', [])
  .config(['$compileProvider', function ($compileProvider) {
    $compileProvider.debugInfoEnabled(false);
  }])
  .directive('ecVcms', ['$timeout', ($timeout) => ({
    restrict: 'E',
    transclude: true,
    scope: {
      html: '=?',
      json: '=?',
      readonly: '=?',
      onSave: '=?',
      config: '=?',
      custom: '=?',
    },
    template: require('./vcms.html'),
    controllerAs: 'ctrl',
    controller: [
      '$scope', '$element', '$attrs', '$transclude', function (scope, elem, attrs, transclude) {
        const editor = document.getElementsByClassName('vcms-content')[0];
        const self = this;
        let restore;
        let codemirror;

        self.config = scope.config ||
          {
            colors: ['#EE4266', '#2A1E5C', '#0A0F0D', '#C4CBCA', '#3CBBB1'],
            tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'p'],
            toolbar: [
              ['tags'],
              ['italic', 'bold', 'link', 'align', 'size'],
              ['list', 'blockquote', 'image', 'icon', 'custom'],
              ['colors'],
              ['presets'],
              ['reset'],
              ['undo', 'redo', 'html'],
            ],
          };

        self.isContainer = function (e) {
          if (e) {
            return e === editor;
          }
          return self.currentElement && self.currentElement[0] === editor;
        };

        $timeout(() => {
          transclude(scope, (clone, scope) => {
            if (editor.innerHTML !== '') {
              scope.json = vcms.toJSON(editor.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, ''));
            }
            scope.html = vcms.toDOM(scope.json);
            editor.innerHTML = scope.html;
          });
        });

        function jsonToCss(json) {
          let css = '';
          Object.keys(json).forEach((key) => {
            css += `${key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}: ${json[key]}; `;
          });
          return css;
        }

        function getParents(el) {
          const els = [];
          while (el) {
            els.unshift(el);
            el = el.parentNode;
          }
          return els;
        }

        function normalizeHTML(el) {
          el.childNodes.forEach((el) => {
            if (el.childNodes) {
              normalizeHTML(el);
            }
            let node;
            if (el.localName === 'b' || el.localName === 'i') {
              const nodes = {
                b: 'strong',
                i: 'em',
              };
              node = document.createElement(nodes[el.localName]);
              node.innerText = el.innerText;
              for (let attr of el.attributes) {
                node.setAttribute(attr.name, attr.value);
              }
              el.replaceWith(node);
            }
            if (el.localName === 'div' && el.firstChild.localName === 'br' && el.firstChild === el.lastChild) {
              node = el.nextElementSibling;
              el.remove();
            }
            if (['br', 'img', 'hr'].indexOf(el.localName) === -1 && el.innerHTML === '') {
              node = el.nextElementSibling;
              el.remove();
            }
            if (node) {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNode(node);
              range.setEnd(node, 1);
              selection.removeAllRanges();
              selection.addRange(range);
              self.currentElement = angular.element(node);
            }
          });
        }

        function refresh() {
          const selection = window.getSelection();
          normalizeHTML(editor);

          if (typeof selection.focusNode === 'string') {
            self.currentElement = angular.element(selection.focusNode.parentNode);
          }
          $timeout(() => {
            scope.json = editor.innerHTML === '' ? [] : vcms.toJSON(editor.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, ''));
            scope.html = vcms.toDOM(scope.json);
            if (self.currentElement) {
              self.tag = self.currentElement[0].localName;
              self.src = self.currentElement.attr('src');
            } else {
              delete self.tag;
            }
          });
        }

        function prevent(e) {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
          return true;
        }

        function makeEditable(e) {
          if (self.currentElement && self.currentElement[0] !== e) {
            self.currentElement[0].removeAttribute('contenteditable');
          }
          if (e !== editor) {
            e.setAttribute('contenteditable', '');
            self.currentElement = angular.element(e);
            self.currentElement[0].focus();
          }
          refresh();
        }

        self.saveImage = function (e) {
          self.currentElement.attr('src', self.src);
          refresh();
          prevent(e);
        };

        self.resetImage = function (e) {
          delete self.currentElement;
          delete self.tag;
          delete self.src;
          prevent(e);
        };

        self.execCommand = function (command, e) {
          const selection = window.getSelection();
          if (getParents(selection.focusNode).some(el => el === self.currentElement[0])) {
            if (!selection.toString().length) {
              const range = document.createRange();
              range.selectNodeContents(selection.focusNode.parentNode);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'].indexOf(command) !== -1) {
              document.execCommand('formatBlock', false, command);
            }
            if (['createLink', 'insertImage'].indexOf(command) !== -1) {
              const url = prompt('Enter the link here: ', 'http:\/\/');
              document.execCommand(command, false, url);
            } else {
              if (command === 'removeFormat') {
                self.currentElement[0].removeAttribute('style');
              }
              document.execCommand(command, false, null);
            }
            self.currentElement = angular.element(selection.focusNode.parentNode);
            prevent(e);
            refresh();
          }
        };

        self.addElement = function (e, type) {
          scope.dirty = true;
          self.currentElement[0].removeAttribute('contenteditable');
          const range = document.createRange();
          const selection = window.getSelection();
          const el = document.createElement(type || 'p');
          el.appendChild(document.createTextNode('Neuer Inhalt'));
          if (self.currentElement[0] === editor) {
            editor.append(el);
          } else {
            self.currentElement.after(el);
          }
          self.currentElement = angular.element(el);
          range.selectNode(el);
          range.setEnd(el, 1);
          selection.removeAllRanges();
          selection.addRange(range);
          el.setAttribute('contenteditable', '');
          if (!self.isContainer(e.target)) {
            for (let attr of e.target.attributes) {
              el.setAttribute(attr.name, attr.value);
            }
          }
          refresh();
          prevent(e);
        };

        scope.saveElement = function (e) {
          console.log('YO')
          if (typeof scope.onSave === 'function') {
            scope.onSave();
          }
          scope.dirty = false;
          restore = null;
          refresh();
          prevent(e);
        };

        scope.resetElement = function (e) {
          if (restore) {
            editor.innerHTML = vcms.toDOM(restore);
            restore = null;
          }
          refresh();
          delete self.currentElement;
          delete self.tag;
          delete self.src;
          scope.dirty = false;
          prevent(e);
        };

        self.deleteElement = function (e) {
          if (self.currentElement[0] !== editor) {
            self.currentElement.remove();
            refresh();
            delete self.currentElement;
            delete self.tag;
            delete self.src;
            window.getSelection().removeAllRanges();
            prevent(e);
          }
        };

        self.toggleHtml = function (e) {
          $timeout(() => {
            refresh();
            if (!codemirror) {
              codemirror = CodeMirror(elem[0].querySelector('.html'), {
                value: editor.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, ''),
                lineNumbers: true,
                lineWrapping: true,
                mode: 'htmlmixed',
              });
              codemirror.on('change', (mirror, i) => {
                editor.innerHTML = angular.copy(mirror.getValue());
                scope.dirty = true;
                refresh();
              });
            } else {
              codemirror.setValue(editor.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, ''));
              $timeout(() => {
                codemirror.refresh();
              });
            }
            self.htmlMode = !self.htmlMode;
            scope.htmlMode = self.htmlMode;
            $timeout(() => {
              codemirror.refresh();
            });
            prevent(e);
          });
        };

        self.toggleClass = function (cl, remove) {
          if (remove) {
            remove.forEach((cl) => {
              self.currentElement[0].classList.remove(cl);
            });
          }
          if (cl) {
            self.currentElement[0].classList.toggle(cl);
          }
        };

        self.toggleAttribute = function (at, remove) {
          if (remove) {
            remove.forEach((at) => {
              const style = self.currentElement[0].getAttribute('style') || '';
              self.currentElement[0].setAttribute('style', style.replace(new RegExp(`${at}\s*:\s*[^;]+\s*;?`, 'ig'), ''));
            });
          }
          if (at) {
            self.currentElement.css(at);
          }
        };

        editor.addEventListener('mousedown', (e) => {
          makeEditable(e.target);
        });

        editor.addEventListener('keyup', () => {
          scope.dirty = true;
          refresh();
        });

        editor.addEventListener('keydown', (e) => {
          if (!restore && scope.json) {
            restore = angular.copy(scope.json);
          }
          const selection = window.getSelection();
          if (selection.focusNode) {
            if (e.keyCode === 27) {
              selection.removeAllRanges();
            }
            if (e.keyCode === 13 && !e.shiftKey) {
              self.addElement(e, self.tag);
            }
          }
        });

        refresh();
      }],
  })])
  .directive('vcmsToolbar', () => ({
    scope: {},
    require: '^ecVcms',
    template: require('./vcms-toolbar.html'),
    link(scope, elem, attrs, vcms) {
      scope.vcms = vcms;

      scope.isTextElement = function () {
        const elements = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'cite', 'strong', 'em', 'a', 'ul', 'ol', 'span',
          'div'];
        if (vcms.currentElement) {
          return elements.indexOf(vcms.tag) !== -1 || elements.find((el) => {
              if (vcms.currentElement[0].parentNode) {
                return vcms.currentElement[0].parentNode.localName === el;
              }
            });
        }
      };

      scope.isImgElement = function () {
        if (vcms.currentElement) {
          return vcms.tag === 'img';
        }
      };

      scope.hasAttr = function (attr, value) {
        if (vcms.currentElement) {
          if (value) {
            return vcms.currentElement.css(attr) === value;
          }
          return vcms.currentElement.css(attr);
        }
      };

      scope.hasClass = function (cl) {
        if (cl && vcms.currentElement) {
          return vcms.currentElement[0].classList.contains(cl);
        }
      };

      scope.hasChild = function (childTag) {
        if (childTag && vcms.currentElement) {
          return vcms.currentElement[0].getElementsByTagName(childTag).length;
        }
      };
    },
  }));
}());
