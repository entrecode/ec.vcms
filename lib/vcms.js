const vcms = require('visual-cms.core');
const html = require('html');

const CodeMirror = require('codemirror/lib/codemirror');
require('codemirror/mode/htmlmixed/htmlmixed');
require('../styles/vcms.scss');

(function () {
  angular.module('vcms', [])
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
    },
    template: require('./vcms.html'),
    controllerAs: 'ctrl',
    controller: [
      '$scope', '$element', '$attrs', '$transclude', function (scope, elem, attrs, transclude) {
        const editor = document.getElementsByClassName('content')[0];
        const self = this;
        let restore;
        let codemirror;

        self.isContainer = function () {
          return self.currentElement && self.currentElement[0] === editor;
        };

        $timeout(() => {
          transclude(scope, (clone, scope) => {
            if (editor.innerHTML !== '') {
              scope.json = vcms.toJSON(editor.innerHTML);
            }
            scope.html = vcms.toDOM(scope.json);
            editor.innerHTML = scope.html;
          });
        });

        self.execCommand = function (command, e) {
          if (getParents(window.getSelection().focusNode).some(el => el === self.currentElement[0])) {
            if (!window.getSelection().toString().length) {
              const range = document.createRange();
              range.selectNodeContents(window.getSelection().focusNode.parentNode);
              window.getSelection().removeAllRanges();
              window.getSelection().addRange(range);
            }
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'].indexOf(command) !== -1) {
              document.execCommand('formatBlock', false, command);
            }
            if (['createLink', 'insertImage'].indexOf(command) !== -1) {
              const url = prompt('Enter the link here: ', 'http:\/\/');
              document.execCommand(command, false, url);
            } else {
              document.execCommand(command, false, null);
            }
            prevent(e);
            refresh();
          }
        };

        function prevent(e) {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
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

        self.addElement = function (e) {
          self.dirty = true;
          const range = document.createRange();
          const selection = window.getSelection();
          selection.removeAllRanges();
          const p = document.createElement('p');
          p.appendChild(document.createTextNode('Neuer Inhalt'));
          if (self.currentElement[0] === editor) {
            editor.append(p);
          } else {
            self.currentElement.after(p);
          }
          self.currentElement = angular.element(p);
          range.selectNode(p);
          range.setEnd(p, 1);
          selection.addRange(range);
          refresh();
          prevent(e);
        };

        self.saveElement = function (e) {
          if (typeof scope.onSave === 'function') {
            scope.onSave();
          }
          self.dirty = false;
          restore = null;
          refresh();
          prevent(e);
        };

        self.resetElement = function (e) {
          if (restore) {
            editor.innerHTML = vcms.toDOM(restore);
            restore = null;
          }
          refresh();
          delete self.currentElement;
          delete self.tag;
          delete self.src;
          self.dirty = false;
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
          refresh();
          if (!codemirror) {
            codemirror = CodeMirror(elem[0].querySelector('.html'), {
              value: html.prettyPrint(editor.innerHTML || ''),
              lineNumbers: true,
              lineWrapping: true,
              mode: 'htmlmixed',
            });
            codemirror.on('change', (mirror, i) => {
              editor.innerHTML = angular.copy(mirror.getValue());
              self.dirty = true;
              refresh();
            });
          } else {
            codemirror.setValue(html.prettyPrint(editor.innerHTML || ''));
            $timeout(() => {
              codemirror.refresh();
            });
          }
          self.htmlMode = !self.htmlMode;
          scope.htmlMode = self.htmlMode;
          prevent(e);
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
              node.innerText = el.innerHTML;
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
              if (!window.getSelection().toString().length) {
                window.getSelection().removeAllRanges();
              }
              const range = document.createRange();
              range.selectNode(node);
              range.setEnd(node, 1);
              window.getSelection().addRange(range);
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
            scope.json = editor.innerHTML === '' ? [] : vcms.toJSON(editor.innerHTML);
            scope.html = vcms.toDOM(scope.json);
            if (self.currentElement) {
              self.tag = self.currentElement[0].localName;
              self.src = self.currentElement.attr('src');
            } else {
              delete self.tag;
            }
          });
        }

        editor.addEventListener('click', (e) => {
          self.currentElement = angular.element(e.target);
          const selection = window.getSelection();
          if (selection.focusNode && !selection.focusNode.length) {
            selection.removeAllRanges();
            try {
              const range = document.createRange();
              range.selectNode(e.target);
              range.setEnd(e.target, 1);
              selection.addRange(range);
            } catch (err) {
            }
          }
          refresh();
        });

        editor.addEventListener('keyup', () => {
          self.dirty = true;
          refresh();
        });

        editor.addEventListener('keydown', (e) => {
          if (!restore && scope.json) {
            restore = angular.copy(scope.json);
          }
          const selection = window.getSelection();
          const parents = getParents(selection.focusNode).map(el => el.localName);
          if (e.keyCode === 65 && e.metaKey) {
            const range = document.createRange();
            range.selectNode(selection.focusNode);
            window.getSelection().addRange(range);
            prevent(e);
          }
          if (selection.focusNode && parents.indexOf('li') === -1) {
            if (e.keyCode === 8 && selection.focusOffset === 0 && selection.focusNode.localName !== 'text') {
              prevent(e);
              selection.removeAllRanges();
            }
            if (e.keyCode === 46 && selection.focusNode &&
              (selection.focusNode.length <= selection.focusOffset || selection.focusOffset === 0)) {
              prevent(e);
              selection.removeAllRanges();
            }
            if (e.keyCode === 13 && !e.metaKey) {
              prevent(e);
              selection.removeAllRanges();
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
