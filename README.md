#Ember Analyzer

##What is it?
- A nodejs server that reads your ember cli project and sets up a graph of component invocations
- A vim plugin that lets you navigate hbs templates and js files.

##Install the vim plugin

For now you'll want to somehow source `vim/finder.vim` in your `.vimrc`

##Install and run the node server
You'll probably need node v5.x or higher
- `npm install && typings install`
- `npm run build`


###Commands to run in hbs templates
- `<leader>fa` will switch between a template and its rendering context.
ie, `app/pods/foo/controller.js` -> `app/pods/foo/template.hbs`
- `<leader>fd` on a bound variable or closure action will jump to its definition in the template's rendering context.  This includes
methods defined in mixins and superclasses.
- `<leader>fd` on a component name will jump to the template file for that component
- `<leader>fp` in a component template will open a quickfix list of places that component is invoked

##Other fun stuff
Go to `localhost:5300/graph.svg` to see a clickable graph of all the component invocations in the app.
