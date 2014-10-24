Live Demo - http://dimapod.github.io/angular-tabs

angular-tabs
============

# Usage
Add xl-ui-components in your bower.json configuration file, in the dependencies section:

`"angular-tabs": "git@github.com:dimapod/angular-tabs.git#version"`

Load the scripts files you are interested in.

```html
<script type="text/javascript" src="path/to/component/angular-tabs.js.min"></script>
```

Add the modules as a dependency to your application module.

```js
var app = angular.module('app', ['angular-tabs'])
```

If you are using shared directives relying on external templates:

1. Load the script templates.js. This file will prepopulate the angular $templateCache.
2. Add the module 'angular-tabs.templates' as a dependency to your application.


# Contribute
## Setup

1. Install **Grunt** and **Bower**
	`$ npm install -g grunt-cli bower`
2. Install development dependencies
	`$ npm install`
3. Install components
	`$ bower install`

## Testing

We use Karma, protractor and jshint to ensure the quality of the code.
Three tasks are available.

1. `$ grunt unit`
2. `$ grunt e2e`
3. `$ grunt test` which runs both the unit tests and acceptance tests.


