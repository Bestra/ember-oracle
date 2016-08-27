#Ember Oracle

##What is it?
- A nodejs server that reads your ember cli project and sets up a graph of component invocations
- A vim plugin that lets you navigate hbs templates and js files.

##Install the vim plugin

For now you'll want to source `vim/finder.vim` in your `.vimrc`
`source ~/ember-oracle/vim/finder.vim`

##Create a config file in your project (optional)

In order for the server to load addons (for now only in-repo addons) you'll
want to add a `.ember-oracle` file to your project's root directory.
It's a JSON file that only has one key for `addonPaths`.  Here's an example.
```json
{
  "addonPaths": ["../my-addon/", "~/some-other-addon"]
}
```

If you're not referencing an in-repo addon this is optional.  Support for
traditional addons is coming...later.

##Install and run the node server
You'll probably need node v5.x or higher
- `npm run dev-setup`
- `ember-oracle-start-server $YOUR_EMBER_APP`


###Commands to run in hbs templates
- `<leader>fa` will switch between a template and its rendering context, either a component or a controller.
ie, `app/pods/foo/controller.js` -> `app/pods/foo/template.hbs`
- `<leader>fd` on a bound variable or closure action will jump to its definition in the template's rendering context.  This includes
methods defined in mixins and superclasses.
- `<leader>fd` on a component name will jump to the template file for that component
- `<leader>fp` in a component template will open a quickfix list of places that component is invoked

####Finding files
`:EmberComponent` and `:EmberTemplate` commands will let you open component definitions and general templates.
Both commands will autocomplete their arguments.  For example if the project has `util/calendar` and `util/datepicker` components,
typing `:EmberComponent util/<Tab>` will show both items.  Component templates will be under `:EmberTemplate components/` for the
time being.  

##Other fun stuff
Go to `localhost:5300/graph.svg` to see a clickable graph of all the component invocations in the app.