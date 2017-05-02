import { Component, Input } from '@angular/core';

@Component({
  selector: 'ec-vcms-toolbar',
  templateUrl: './vcms.toolbar.component.html',
  styleUrls: ['./vcms.toolbar.component.scss']
})
export class VcmsToolbarComponent {
  @Input() vcms: any;
  showConfig: any = {};
  link: any = {};

  isTextElement(): boolean {
    const elements = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'cite', 'strong', 'em', 'a', 'ul', 'ol', 'span',
      'div', 'small'];
    if (this.vcms.currentElement) {
      return elements.indexOf(this.vcms.tag) !== -1 ||
        elements.some((el) => {
          if (this.vcms.currentElement.parentNode) {
            return this.vcms.currentElement.parentNode.localName === el;
          }
          return false;
        });
    }
    return false;
  }

  getSynonym(tag): string {
    return this.vcms.config.synonyms[tag || this.vcms.tag];
  }

  isImgElement(): boolean {
    if (this.vcms.currentElement) {
      this.showConfig.showImagePop = true;
      return this.vcms.tag === 'img';
    }
    return false;
  }

  hasAttr(attr, value): boolean | string {
    if (this.vcms.currentElement) {
      if (value) {
        return this.vcms.currentElement.style[attr] === value;
      }
      return this.vcms.currentElement.style[attr];
    }
    return false;
  }

  hasClass(cl): boolean {
    if (cl && this.vcms.currentElement) {
      return this.vcms.currentElement.classList.contains(cl);
    }
    return false;
  }

  hasChild(childTag): boolean | number {
    if (childTag && this.vcms.currentElement) {
      return this.vcms.currentElement.getElementsByTagName(childTag).length;
    }
    return false;
  }

  togglePop(popKey): void {
    const newValue = !this.showConfig[popKey];
    Object.keys(this.showConfig).forEach((key) => {
      this.showConfig[key] = false;
    });
    if (popKey === 'linkPop') {
      this.link.url = this.vcms.currentElement.getAttribute('href');
      this.link.target = this.vcms.currentElement.getAttribute('target');
    } else {
      this.link = {};
    }
    this.showConfig[popKey] = newValue;
  }
}
