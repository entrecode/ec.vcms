const vcms = require('visual-cms.core');
const CodeMirror = require('codemirror/lib/codemirror');
require('codemirror/mode/htmlmixed/htmlmixed');
require('../styles/vcms.scss');

(function () {
  angular.module('ec.vcms', [])
  .config(['$compileProvider', function ($compileProvider) {
    $compileProvider.debugInfoEnabled(false);
  }])
  .directive('ecVcms', ['$timeout', $timeout => ({
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
        scope.vcms = this;

        let restore;
        let codemirror;

        scope.vcms.config = scope.config ||
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
            autosave: true,
          };

        scope.vcms.htmlMode = false;
        scope.htmlMode = false;

        scope.vcms.isContainer = function (e) {
          if (e) {
            return e === editor;
          }
          return scope.vcms.currentElement && scope.vcms.currentElement[0] === editor;
        };

        $timeout(() => {
          transclude(scope, (clone, scope) => {
            if (editor.innerHTML.length) {
              normalizeHTML(editor);
              scope.json = vcms.toJSON(editor.innerHTML.replace(/\s?contenteditable='(\w*)'/ig, ''));
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
                for (const attr of el.attributes) {
                  node.setAttribute(attr.name, attr.value);
                }
                el.replaceWith(node);
              }
              if (node) {
                const selection = window.getSelection();
                const range = document.createRange();
                try {
                  if (range) {
                    range.selectNode(node);
                    range.setEnd(node, 1);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                } catch (err) {

                }
                if (scope.vcms.currentElement) {
                  scope.vcms.currentElement = angular.element(node);
                }
              }
            }
          });
        }

        function placeCaretAtEnd(el) {
          if(el.localName === 'br') {
            el = el.previousSibling;
          }
          el.setAttribute('contenteditable', '');
          scope.vcms.currentElement = angular.element(el);
          scope.vcms.tag = scope.vcms.currentElement[0].localName;
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }

        function refresh() {
          if (!editor.innerHTML.length) {
            editor.setAttribute('contenteditable', '');
            delete scope.vcms.currentElement;
            delete scope.vcms.tag;
            delete scope.vcms.src;
          } else {
            editor.removeAttribute('contenteditable');
          }
          const selection = window.getSelection();
          normalizeHTML(editor);

          if (typeof selection.focusNode === 'string') {
            scope.vcms.currentElement = angular.element(selection.focusNode.parentNode);
          }
          $timeout(() => {
            scope.json = editor.innerHTML === '' ? [] : vcms.toJSON(editor.innerHTML.replace(/\s?contenteditable='(\w*)'/ig, ''));
            scope.html = vcms.toDOM(scope.json);
            if (scope.vcms.currentElement) {
              scope.vcms.tag = scope.vcms.currentElement[0].localName;
              scope.vcms.src = scope.vcms.currentElement.attr('src');
            } else {
              delete scope.vcms.tag;
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
          if (scope.vcms.currentElement && scope.vcms.currentElement[0] !== e) {
            scope.vcms.currentElement[0].removeAttribute('contenteditable');
          }
          if (e !== editor) {
            e.setAttribute('contenteditable', '');
            scope.vcms.currentElement = angular.element(e);
            scope.vcms.currentElement[0].focus();
          }
          refresh();
        }

        scope.vcms.saveImage = function (e) {
          scope.vcms.currentElement.attr('src', scope.vcms.src);
          refresh();
          prevent(e);
        };

        scope.vcms.resetImage = function (e) {
          delete scope.vcms.currentElement;
          delete scope.vcms.tag;
          delete scope.vcms.src;
          prevent(e);
        };

        scope.vcms.execCommand = function (command, e, data) {
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
            if (selection.focusOffset === scope.vcms.currentElement[0].innerText.length) {
              const img = document.createElement('img');
              img.setAttribute('src', url);
              scope.vcms.currentElement.after(img);
            } else {
              document.execCommand(command, false, url);
            }
          } else if (command === 'createLink') {
            if (scope.vcms.tag === 'a') {
              scope.vcms.currentElement[0].setAttribute('href', data.url);
            } else {
              document.execCommand('createLink', false, data.url);
              scope.vcms.currentElement = angular.element(scope.vcms.currentElement[0].children[0]);
            }
            if (data.blank) {
              scope.vcms.currentElement[0].setAttribute('target', '_blank');
            } else {
              scope.vcms.currentElement[0].removeAttribute('target');
            }
          } else if (command === 'removeFormat') {
            scope.vcms.currentElement[0].removeAttribute('style');
          } else {
            document.execCommand(command, false, null);
          }
          editor.removeAttribute('contenteditable');
          scope.vcms.currentElement = angular.element(selection.focusNode.parentNode);
          prevent(e);
          refresh();
          return true;
        };

        scope.vcms.jsonToCss = function (json) {
          let css = '';
          Object.keys(json).forEach((key) => {
            css += `${key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}: ${json[key]}; `;
          });
          return css;
        };

        scope.vcms.addElement = function (e, type) {
          scope.vcms.dirty = true;

          if (scope.vcms.currentElement) {
            scope.vcms.currentElement[0].removeAttribute('contenteditable');
          }
          const range = document.createRange();
          const selection = window.getSelection();
          const el = document.createElement(type || 'p');
          el.appendChild(document.createTextNode('Neuer Inhalt'));

          if (el === editor || !scope.vcms.currentElement) {
            editor.append(el);
          } else {
            if (['span', 'strong', 'em', 'small'].indexOf(scope.vcms.tag) !== -1) {
              const br = document.createElement('br');
              scope.vcms.currentElement.after(br);
              br.after(el);
            } else {
              scope.vcms.currentElement.after(el);
            }
          }
          scope.vcms.currentElement = angular.element(el);
          try {
            if (range) {
              range.selectNode(el);
              range.setEnd(el, 1);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } catch (err) {
          }
          el.setAttribute('contenteditable', '');
          if (!scope.vcms.isContainer(e.target) && type) {
            for (const attr of e.target.attributes) {
              el.setAttribute(attr.name, attr.value);
            }
          }
          el.focus();
          refresh();
          prevent(e);
        };

        scope.vcms.saveElement = function (e) {
          if (typeof scope.onSave === 'function') {
            scope.onSave();
          }
          scope.vcms.dirty = false;
          restore = null;
          refresh();
          prevent(e);
        };

        scope.vcms.resetElement = function (e) {
          if (restore) {
            editor.innerHTML = vcms.toDOM(restore);
            restore = null;
          }
          refresh();
          delete scope.vcms.currentElement;
          delete scope.vcms.tag;
          delete scope.vcms.src;
          scope.vcms.dirty = false;
          prevent(e);
        };

        scope.vcms.deleteElement = function (e) {
          if (scope.vcms.currentElement[0] !== editor) {
            scope.vcms.currentElement.remove();
            refresh();
            delete scope.vcms.currentElement;
            delete scope.vcms.tag;
            delete scope.vcms.src;
            window.getSelection().removeAllRanges();
            prevent(e);
          }
        };

        scope.vcms.toggleHtml = function (e) {
          $timeout(() => {
            refresh();
            if (!codemirror) {
              codemirror = CodeMirror(elem[0].querySelector('.vcms-html'), {
                value: editor.innerHTML.replace(/\s?contenteditable='(\w*)'/ig, ''),
                lineNumbers: true,
                lineWrapping: true,
                mode: 'htmlmixed',
              });
              codemirror.on('change', (mirror, i) => {
                editor.innerHTML = angular.copy(mirror.getValue());
                scope.vcms.dirty = true;
                refresh();
              });
            } else {
              codemirror.setValue(editor.innerHTML.replace(/\s?contenteditable='(\w*)'/ig, ''));
              $timeout(() => {
                codemirror.refresh();
              });
            }
            scope.vcms.htmlMode = !scope.vcms.htmlMode;
            $timeout(() => {
              codemirror.refresh();
            });
            prevent(e);
          });
        };

        scope.vcms.toggleClass = function (cl, remove) {
          if (remove) {
            remove.forEach((cl) => {
              scope.vcms.currentElement[0].classList.remove(cl);
            });
          }
          if (cl) {
            scope.vcms.currentElement[0].classList.toggle(cl);
          }
        };

        scope.vcms.toggleAttribute = function (at, remove) {
          if (remove) {
            remove.forEach((at) => {
              const style = scope.vcms.currentElement[0].getAttribute('style') || '';
              scope.vcms.currentElement[0].setAttribute('style', style.replace(new RegExp(`${at}\s*:\s*[^;]+\s*;?`, 'ig'), ''));
            });
          }
          if (at) {
            scope.vcms.currentElement.css(at);
          }
        };

        scope.vcms.applyStyle = function (styles) {
          scope.vcms.currentElement[0].setAttribute('style', scope.vcms.jsonToCss(styles));
        };

        editor.addEventListener('focusout', (e) => {
          if (scope.config.autosave) {
            scope.vcms.saveElement();
          }
          try {
            if (!scope.vcms.currentElement[0].innerText.length) {
              if (scope.vcms.currentElement[0].nextSibling.localName === 'br') {
                angular.element(scope.vcms.currentElement[0].nextSibling).remove();
              }
              scope.vcms.deleteElement(e);
            }
          } catch (err) {

          }
        });

        editor.addEventListener('mousedown', (e) => {
          makeEditable(e.target);
        });

        editor.addEventListener('keyup', (e) => {
          scope.vcms.dirty = true;
          refresh();
        });

        editor.addEventListener('keydown', (e) => {
          if ([8, 46].indexOf(e.keyCode) !== -1) {
            try {
              if (!scope.vcms.currentElement[0].innerText.length) {
                placeCaretAtEnd(e.target.previousSibling);
                prevent(e);
                if (scope.vcms.currentElement[0].nextSibling.localName === 'br') {
                  angular.element(scope.vcms.currentElement[0].nextSibling).remove();
                }
                angular.element(e.target).remove();
              }
            } catch (err) {

            }
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
              if (scope.vcms.tag !== 'li') {
                scope.vcms.addElement(e, scope.vcms.tag);
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
          'div', 'small'];
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
        Object.keys(scope.showConfig).forEach((key) => {
          scope.showConfig[key] = false;
        });
        scope.showConfig[popKey] = newValue;
      };
    },
  }))
  .filter('unsafe', $sce => $sce.trustAsHtml);
}());
