const vcms = require('visual-cms.core');
const CodeMirror = require('codemirror/lib/codemirror');
require('codemirror/mode/htmlmixed/htmlmixed');
require('../styles/vcms.scss');

(function () {
  angular.module('ec.vcms', [])
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
        const editor = elem[0].querySelector('.vcms-content');
        const self = this;
        let restore;
        let codemirror;
        let ct = 0;

        self.config = scope.config ||
          {
            colors: ['#EE4266', '#2A1E5C', '#0A0F0D', '#C4CBCA', '#3CBBB1'],
            tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'],
            synonyms: {
              h1: 'Headline 1',
              h2: 'Headline 2',
              h3: 'Headline 3',
              h4: 'Headline 4',
              h5: 'Headline 5',
              h6: 'Headline 6',
              p: 'Absatz',
              a: 'Link',
              ol: 'Liste',
              ul: 'Liste',
              div: 'Block',
              span: 'Inline',
              strong: 'Fett',
              em: 'Kursiv',
              img: 'Bild',
            },
            toolbar: [
              ['tags'],
              ['italic', 'bold', 'link', 'align', 'size'],
              ['list', 'image', 'custom'],
              ['colors'],
              ['presets'],
              ['reset'],
              ['undo', 'redo', 'html'],
            ],
          };

        self.htmlMode = false;
        scope.htmlMode = false;

        self.isContainer = function (e) {
          if (e) {
            return e === editor;
          }
          return self.currentElement && self.currentElement[0] === editor;
        };

        $timeout(() => {
          transclude(scope, (clone, scope) => {
            if (editor.innerHTML.length) {
              normalizeHTML(editor);
              scope.json = vcms.toJSON(editor.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, ''));
            }
            scope.html = vcms.toDOM(scope.json);
            editor.innerHTML = scope.html;
          });
        });

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
            if (el) {
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
                if (range) {
                  range.selectNode(node);
                  range.setEnd(node, 1);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
                if (self.currentElement) {
                  self.currentElement = angular.element(node);
                }
              }
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

        self.execCommand = function (command, e, data) {
          editor.setAttribute('contenteditable', '');
          const selection = window.getSelection();
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'].indexOf(command) !== -1) {
            if (!selection.toString().length) {
              const range = document.createRange();
              range.selectNodeContents(selection.focusNode.parentNode);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            document.execCommand('formatBlock', false, command);
          } else if (command === 'insertImage') {
            const url = prompt('Enter the link here: ', 'https:\/\/');
            if (selection.focusOffset === self.currentElement[0].innerText.length) {
              var img = document.createElement('img');
              img.setAttribute('src', url);
              self.currentElement.after(img);
            } else {
              document.execCommand(command, false, url);
            }
          } else if (command === 'createLink') {
            if (self.tag === 'a') {
              self.currentElement[0].setAttribute('href', data.url);
            } else {
              document.execCommand('createLink', false, data.url);
              self.currentElement = angular.element(self.currentElement[0].children[0]);
            }
            if (data.blank) {
              self.currentElement[0].setAttribute('target', '_blank');
            } else {
              self.currentElement[0].removeAttribute('target');
            }
          } else if (command === 'removeFormat') {
            self.currentElement[0].removeAttribute('style');
          } else {
            document.execCommand(command, false, null);
          }
          editor.removeAttribute('contenteditable');
          self.currentElement = angular.element(selection.focusNode.parentNode);
          prevent(e);
          refresh();
          return true;
        };

        self.jsonToCss = function (json) {
          let css = '';
          Object.keys(json).forEach((key) => {
            css += `${key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}: ${json[key]}; `;
          });
          return css;
        };

        self.addElement = function (e, type) {
          scope.dirty = true;

          if(self.currentElement) {
            self.currentElement[0].removeAttribute('contenteditable');
          }
          const range = document.createRange();
          const selection = window.getSelection();
          const el = document.createElement(type || 'p');
          el.appendChild(document.createTextNode('Neuer Inhalt'));

          if (el === editor || !self.currentElement) {
            editor.append(el);
          } else {
            //TODO what is this for?
            // var br = document.createElement('br');
            // self.currentElement.after(br);
            // br.after(el);
            editor.append(el);
          }
          self.currentElement = angular.element(el);
          if (range) {
            range.selectNode(el);
            range.setEnd(el, 1);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          el.setAttribute('contenteditable', '');
          if (!self.isContainer(e.target) && type) {
            for (const attr of e.target.attributes) {
              el.setAttribute(attr.name, attr.value);
            }
          }
          el.focus();
          refresh();
          prevent(e);
        };

        scope.saveElement = function (e) {
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

        self.applyStyle = function (styles) {
          self.currentElement[0].setAttribute('style', self.jsonToCss(styles));
        };

        editor.addEventListener('focusout', scope.resetElement);

        editor.addEventListener('mousedown', (e) => {
          makeEditable(e.target);
        });

        editor.addEventListener('keyup', () => {
          scope.dirty = true;
          refresh();
        });

        editor.addEventListener('keydown', (e) => {
          if (e.keyCode === 8) {
            if (self.currentElement && self.currentElement[0].innerText.length === 1) {
              ct = ct + 1;
            }
            if (ct === 2) {
              self.deleteElement(e);
              ct = 0;
            }
          } else {
            ct = 0;
          }
          if (!restore && scope.json) {
            restore = angular.copy(scope.json);
          }
          const selection = window.getSelection();
          if (selection.focusNode) {
            if (e.keyCode === 27) {
              selection.removeAllRanges();
            }
            if (e.keyCode === 13 && !e.shiftKey) {
              if (self.tag !== 'li') {
                self.addElement(e, self.tag);
              }
            }
          }
        });

        refresh();
      }],
  })])
  .directive('vcmsToolbar', () => ({
    scope: true,
    require: '^ecVcms',
    template: require('./vcms-toolbar.html'),
    link(scope, elem, attrs, vcms) {
      scope.vcms = vcms;
      scope.showConfig = {};

      scope.isTextElement = function isTextElement() {
        const elements = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'cite', 'strong', 'em', 'a', 'ul', 'ol', 'span',
          'div'];
        if (vcms.currentElement) {
          return elements.indexOf(vcms.tag) !== -1 ||
            elements.find((el) => {
              if (vcms.currentElement[0].parentNode) {
                return vcms.currentElement[0].parentNode.localName === el;
              }
              return false;
            });
        }
        return false;
      };

      scope.getSynonym = function getSynonym(tag) {
        return vcms.config.synonyms[tag || vcms.tag];
      };

      scope.isImgElement = function isImgElement() {
        if (vcms.currentElement) {
          scope.showConfig.showImagePop = true;
          return vcms.tag === 'img';
        }
        return false;
      };

      scope.hasAttr = function hasAttr(attr, value) {
        if (vcms.currentElement) {
          if (value) {
            return vcms.currentElement.css(attr) === value;
          }
          return vcms.currentElement.css(attr);
        }
        return false;
      };

      scope.hasClass = function hasClass(cl) {
        if (cl && vcms.currentElement) {
          return vcms.currentElement[0].classList.contains(cl);
        }
        return false;
      };

      scope.hasChild = function hasChild(childTag) {
        if (childTag && vcms.currentElement) {
          return vcms.currentElement[0].getElementsByTagName(childTag).length;
        }
        return false;
      };

      scope.togglePop = function (popKey) {
        const newValue = !scope.showConfig[popKey];
        Object.keys(scope.showConfig).forEach(function (key) {
          scope.showConfig[key] = false;
        });
        scope.showConfig[popKey] = newValue;
      };
    },
  }))
  .filter('unsafe', function ($sce) {
    return $sce.trustAsHtml;
  });
}());
