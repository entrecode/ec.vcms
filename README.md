# ec.vcms 

> Lightweight Angular WYSIWYG editor based on JSON data structure. By entrecode.


## Basics

This project contains a lightweight WYSIWYG editor based on JSON data structure for usage in angularJS projects.

## Getting started

Install the package:

```sh
npm i ec.vcms --save
```

Add the `ec.vcms` module to your angular app:

```js
angular.module('demoapp', ['ec.vcms'])
```

Add the ec-vcms directive to your template. The directive binds the parsed JSON with the variable passed in the json attribute.

```html
<ec-vcms json="mydata"></ec-vcms>
```

## Advanced options
### Preset Content

You can simply wrap the content you want with the `ec-vcms` component since transclution is supported:

```html
<ec-vcms json="mydata">
  <h1 style="text-align: center;">TEST</h1>
  <p><b style="color: red;">BOLD</b></p>
  <p><i>ITALIC</i></p>
  <img src="https://unsplash.it/200/200">
  <p>
    <small>tolles Bild</small>
  </p>
</ec-vcms>
```

### Config

You can pass your individual config to the ec-vcms directive via the config attribute:

```html
<ec-vcms json="mydata" config="config"></ec-vcms>
```

The config object looks like:

```js
{
  colors: ['#000000', 'orange', '#FFF', 'rgba(231,212,231,.4)'],
  tags: ['h1', 'h2', 'p'],
  synonyms: {
    h1: 'Headline 1',
    h2: 'Headline 2',
    p: 'Absatz',
  },
  custom: [{
    title: 'Violet',
    preview: '<div style="color: violet;">Violet</div>',
    command: (current, e) => {
      const el = document.createElement('div');
      el.appendChild(document.createTextNode('Violet'));
      el.setAttribute('style', 'color: violet;');
      current.after(el);
    },
  }, {
    title: 'Button',
    preview: '<a class="btn">Button Label</a>',
    command: (current, e) => {
      current.after(angular.element('<a class="btn">Button Label</a>')[0]);
    },
  }],
  toolbar: [
    ['tags'],
    ['bold', 'italic', 'link', 'align', 'size'],
    ['list', 'custom'],
    ['colors'],
    ['reset'],
    ['html'],
  ],
}
```

The following config parameters are supported:

* `colors` An array of color values supported by CSS
* `tags` An array of html tags. These tags will be available to format the selected element
* `synonyms` Labels for the the tags
* `custom` A collection of custom commands available via the toolbar element "custom"
* `presets` A collection of style presets available via the toolbar element "presets"
* `toolbar` A multidimensional array of elements which are shown in the toolbar.

The following toolbar elements are supported:

* `tags` List of Tags set in the `tags` config param to format the selected element
* `bold` Button to toggle font weight
* `italic` Button to toggle italic
* `link` Button to add or edit a link
* `align` Button to set alignment
* `size` Button to change font size
* `list` Submenu with unordered and ordered list
* `image` Button to add an image via pop
* `custom` List of custom commands set in the `custom` config param to format the selected element or add a new one
* `colors` Dropdown with colors set in the `colors` config param and hex input
* `presets` List of custom style presets set in the `presets` config param to format the selected element
* `reset` Button to reset style of the selected element
* `html` Button to toggle html mode

Future toolbar elements:

* `icon`
* `blockquote`
* `undo` Undo button
* `redo` Redo button

The default config is:

```js
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
}
```

### Custom commands

Custom commands can be passed via the `custom` parameter of the config object.

A custom command can look like:

```js
{
  title: 'Button',
  preview: '<a class="btn">Button Label</a>',
  command: (elem, event) => {
    elem.after(angular.element('<a class="btn">Button Label</a>')[0]);
  },
}
```
Parameters of a custom command object:

* `title` (required) The title of the custom command
* `preview` (optional) The html preview rendered in the custom command list
* `command` (required) function

Parameters of the command function:

* `elem` DOM Element which can be modified
* `event` Pointer Event



### Style Presets

Style presets can be passed via the `presets` parameter of the config object.

A style preset looks like:

```js
{
  title: 'Embossed',
  styles: {
    textShadow: '-1px -1px 0 rgba(255,255,255,0.3), 1px 1px 0 rgba(0,0,0,0.8)'
  },
}
```
Parameters of a custom command object:

* `title` (required) The title of the preset style
* `styles` (required) key, value pairs of css styles - key must be camelCased