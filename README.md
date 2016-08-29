#Ember Oracle


##What is it?
- A nodejs server that reads your ember cli project and sets up a graph of component invocations
- A vim plugin that lets you navigate hbs templates and js files.

##Install and run the node server
You'll probably need node v5.x or higher
- `npm install -g ember-oracle`  The install will print the path of the `ember-oracle.vim` file that
you'll need to source.
- `ember-oracle-start-server $YOUR_EMBER_APP`, where `$YOUR_EMBER_APP` is the root of your ember-cli project.  You'll see some gratuitious console output.

##Install the vim plugin
For now you'll want to source `ember-oracle.vim` in your `.vimrc`
`source /usr/local/lib/node_modules/ember-oracle/vim/ember-oracle.vim`


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
The left side of each node is a list of the props declared in the rendering context
for a given template.  The right side is a list of paths (bound variables) referenced
in the template itself.  The graph has a few issues with self-referencing components at
the moment.

##Current quirks
- You'll have to restart the server when files change.
- If the server can't find the definition for term you'll
hopefully get a message saying so.

##Development
ember-oracle is written in typescript.  If you check out the 
git repo you can run `npm install` locally to install typescript
and make a build.  Please forgive the messiness of the initial development! I'd never
done anything like this previously. 


