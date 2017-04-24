import {
  AfterContentInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild
} from '@angular/core';
import * as core from 'visual-cms.core';
import * as CodeMirror from 'codemirror/lib/codemirror.js';
import * as pretty from 'pretty';
import * as htmlMixed from 'codemirror/mode/htmlmixed/htmlmixed.js';

@Component({
  selector: 'ec-vcms',
  templateUrl: './vcms.component.html',
  styleUrls: ['./vcms.component.scss']
})
export class VcmsComponent implements AfterContentInit, OnChanges {
  @Output() jsonChange: EventEmitter<any> = new EventEmitter();
  @Output() htmlChange: EventEmitter<any> = new EventEmitter();
  @Output() save: EventEmitter<any> = new EventEmitter();
  @Input() json: any;
  @Input() html: any;
  @Input() readonly: boolean;
  @Input() config: any;
  @Input() custom: any;
  @ViewChild('editor') editor: ElementRef;
  @ViewChild('htmlEditor') htmlEditor: ElementRef;

  public htmlMode: boolean;
  public currentElement: any;
  public tag: string;
  public src: string;
  private restore: any;
  public dirty: boolean;
  private codemirror: any;
  private mode: any = htmlMixed;

  constructor() {
    this.config = this.config || {
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
          ['html'],
        ],
        autosave: true,
      };
  }

  ngOnChanges(): void {
    if (this.readonly) {
      if (this.json) {
        this.editor.nativeElement.innerHTML = core.toDOM(this.json);
      } else if (this.html) {
        this.editor.nativeElement.innerHTML = this.html;
      }
    }
  }

  ngAfterContentInit(): void {
    if (this.json) {
      this.editor.nativeElement.innerHTML = core.toDOM(this.json);
    } else if (this.html) {
      this.editor.nativeElement.innerHTML = this.html;
    }

    if (!this.readonly) {
      this.editor.nativeElement.addEventListener('focusout', (e) => {
        if (this.config.autosave) {
          this.saveElement(e);
        }
        try {
          if (!this.currentElement.innerText.length && this.currentElement.localName !== 'img') {
            if (this.currentElement.nextSibling.localName === 'br') {
              this.editor.nativeElement.removeChild(this.currentElement.nextSibling);
            }
            this.deleteElement(e);
          }
        } catch (err) {

        }
      });

      this.editor.nativeElement.addEventListener('mousedown', (e) => {
        this.makeEditable(e.target);
      });

      this.editor.nativeElement.addEventListener('keyup', (e) => {
        this.dirty = true;
        this.refresh();
      });

      this.editor.nativeElement.addEventListener('keydown', (e) => {
        if ([8, 46].indexOf(e.keyCode) !== -1) {
          try {
            if (!this.currentElement.innerText.length) {
              this.placeCaretAtEnd(e.target.previousSibling);
              this.prevent(e);
              if (this.currentElement.nextSibling.localName === 'br') {
                this.editor.nativeElement.removeChild(this.currentElement.nextSibling);
              }
              e.target.parentElement.removeChild(e.target);
            }
          } catch (err) {

          }
        }
        if (!this.restore && this.json) {
          this.restore = Object.assign(this.json);
        }
        const selection = window.getSelection();
        if (selection.focusNode) {
          if (e.keyCode === 27) {
            selection.removeAllRanges();
          }
          if (e.keyCode === 13 && !e.shiftKey) {
            if (this.tag !== 'li') {
              this.addElement(e, this.tag);
            }
          }
        }
      });
    }
    setTimeout(this.refresh.bind(this));
  }

  isContainer(e): boolean {
    if (e) {
      return e === this.editor.nativeElement;
    }
    return this.currentElement === this.editor.nativeElement;
  }

  getParents(el): Array<HTMLElement> {
    const els = [];
    while (el) {
      els.unshift(el);
      el = el.parentNode;
    }
    return els;
  }

  normalizeHTML(el): void {
    el.childNodes.forEach((el) => {
      if (el) {
        if (el.childNodes) {
          this.normalizeHTML(el);
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
          range.selectNode(node);
          range.setEnd(node, 1);
          if (document.body.contains(range.startContainer)) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          if (this.currentElement) {
            this.currentElement = node;
          }
        }
      }
    });
  }

  placeCaretAtEnd(el): void {
    if (el.localName === 'br') {
      el = el.previousSibling;
    }
    el.setAttribute('contenteditable', true);
    this.currentElement = el;
    this.tag = el.localName;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  refresh(): void {
    if (!this.editor.nativeElement.innerHTML.length) {
      delete this.currentElement;
      delete this.tag;
      delete this.src;
    }
    const selection: any = window.getSelection();
    this.normalizeHTML(this.editor.nativeElement);

    if (typeof selection.focusNode === 'string') {
      this.currentElement = selection.focusNode.parentNode;
    }
    this.json = this.editor.nativeElement.innerHTML === '' ? [] : core.toJSON(this.editor.nativeElement.innerHTML);
    this.html = core.toDOM(this.json);
    if (this.currentElement) {
      this.tag = this.currentElement.localName;
      this.src = this.currentElement.getAttribute('src');
    } else {
      delete this.tag;
    }
    this.htmlChange.emit(this.editor.nativeElement.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, ''));
    this.jsonChange.emit(this.editor.nativeElement.innerHTML !== '' ? core.toJSON(this.editor.nativeElement.innerHTML.replace(/\s?contenteditable="(\w*)"/ig, '')) : []);
  }

  prevent(e): boolean {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  makeEditable(e): void {
    if (e !== this.editor.nativeElement) {
      if (this.currentElement && this.currentElement !== e) {
        this.currentElement.removeAttribute('contenteditable');
      }
      this.currentElement = e;
      if (this.currentElement.localName !== 'img') {
        this.currentElement.setAttribute('contenteditable', true);
        setTimeout(() => this.currentElement.focus());
      }
    }
    this.refresh();
  }

  saveImage(e): void {
    this.currentElement.setAttribute('src', this.src);
    this.refresh();
    this.prevent(e);
  };

  resetImage(e): void {
    delete this.currentElement;
    delete this.tag;
    delete this.src;
    this.prevent(e);
  };

  execCommand(command, e, data): boolean {
    this.editor.nativeElement.setAttribute('contenteditable', true);
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
      if (selection.focusOffset === this.currentElement.innerText.length) {
        const img = document.createElement('img');
        img.setAttribute('src', url);
        this.currentElement.after(img);
      } else {
        document.execCommand(command, false, url);
      }
    } else if (command === 'createLink') {
      if (this.tag === 'a') {
        this.currentElement.setAttribute('href', data.url);
      } else {
        const range = document.createRange();
        range.selectNodeContents(this.currentElement);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand(command, false, data.url);
        this.currentElement.removeAttribute('contenteditable');
        this.currentElement = this.currentElement.children[0];
        this.makeEditable(this.currentElement);
      }
      if (data.blank) {
        this.currentElement.setAttribute('target', '_blank');
      } else {
        this.currentElement.removeAttribute('target');
      }
    } else if (command === 'removeFormat') {
      this.currentElement.removeAttribute('style');
    } else {
      if (!selection.toString().length || (this.currentElement.innerText.length === selection.toString().length)) {
        const range = document.createRange();
        range.selectNodeContents(selection.focusNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      document.execCommand(command, false, null);
    }
    this.editor.nativeElement.removeAttribute('contenteditable');
    this.currentElement = selection.focusNode.parentNode;
    this.prevent(e);
    this.refresh();
    return true;
  };

  jsonToCss(json): string {
    let css = '';
    Object.keys(json).forEach((key) => {
      css += `${key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}: ${json[key]}; `;
    });
    return css;
  };

  addElement(e, type): void {
    if (!this.restore && this.json) {
      this.restore = Object.assign(this.json);
    }
    this.dirty = true;

    if (this.currentElement) {
      this.currentElement.removeAttribute('contenteditable');
    }
    const range = document.createRange();
    const selection = window.getSelection();
    const el = document.createElement(type || 'p');
    el.appendChild(document.createTextNode(''));

    if (el === this.editor.nativeElement || !this.currentElement) {
      this.editor.nativeElement.append(el);
    } else {
      if (['span', 'strong', 'em', 'small'].indexOf(this.tag) !== -1) {
        const br: any = document.createElement('br');
        this.currentElement.after(br);
        br.after(el);
      } else {
        this.currentElement.after(el);
      }
    }
    this.currentElement = el;
    range.selectNodeContents(el);
    if (document.body.contains(range.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (!this.isContainer(e.target) && type) {
      for (const attr of e.target.attributes) {
        el.setAttribute(attr.name, attr.value);
      }
    }
    this.makeEditable(el);
    this.refresh();
    this.prevent(e);
  };

  saveElement(e): void {
    this.save.emit(e);
    this.dirty = false;
    this.restore = null;
    this.refresh();
    this.prevent(e);
  };

  resetElement(e): void {
    if (this.restore) {
      this.editor.nativeElement.innerHTML = core.toDOM(this.restore);
      this.restore = null;
    }
    this.refresh();
    delete this.currentElement;
    delete this.tag;
    delete this.src;
    this.dirty = false;
    this.prevent(e);
  };

  deleteElement(e): void {
    if (this.currentElement !== this.editor.nativeElement) {
      this.editor.nativeElement.removeChild(this.currentElement);
      this.refresh();
      delete this.currentElement;
      delete this.tag;
      delete this.src;
      window.getSelection().removeAllRanges();
      this.prevent(e);
    }
  };

  beautifyHtml(e): void {
    this.editor.nativeElement.innerHTML = pretty(this.editor.nativeElement.innerHTML, { ocd: true });
    this.codemirror.setValue(pretty(this.editor.nativeElement.innerHTML, { ocd: true }));
    this.prevent(e);
  };

  toggleHtml(e): void {
    if (this.currentElement) {
      this.currentElement.removeAttribute('contenteditable');
      delete this.currentElement;
    }
    this.refresh();
    if (!this.codemirror) {
      this.codemirror = CodeMirror(this.htmlEditor.nativeElement, {
        value: this.editor.nativeElement.innerHTML,
        lineNumbers: true,
        lineWrapping: true,
        mode: 'htmlmixed',
      });
      this.codemirror.on('change', (mirror, i) => {
        this.editor.nativeElement.innerHTML = Object.assign(mirror.getValue());
        this.dirty = true;
        this.refresh();
      });
    } else {
      this.codemirror.setValue(this.editor.nativeElement.innerHTML);
      this.codemirror.refresh();
    }
    this.htmlMode = !this.htmlMode;
    setTimeout(() => this.codemirror.refresh());
    this.prevent(e);
  };

  toggleClass(cl, remove): void {
    if (remove) {
      remove.forEach((cl) => {
        this.currentElement.classList.remove(cl);
      });
    }
    if (cl) {
      this.currentElement.classList.toggle(cl);
    }
  };

  toggleAttribute(at, val, remove): void {
    if (remove) {
      remove.forEach((at) => {
        this.currentElement.style[at] = '';
      });
    }
    this.currentElement.style[at] = val;
  };

  applyStyle(styles): void {
    this.currentElement.setAttribute('style', this.jsonToCss(styles));
  };

}
