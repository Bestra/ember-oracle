let s:server_command = "ember-oracle-call-server"

function! JumpToFile(locationStr)
  let segments = split(a:locationStr, ":")

  let current_file = expand('%:p')

  if current_file !=? segments[0]
    exec "edit ".segments[0]
  endif
  
  if len(segments) > 1
    call cursor(segments[1], segments[2])
  else
    echom "No position in the file was found"
  endif
endfunction

function! EmberDef()
  let current_file = expand('%:p')
  let full_command = join([s:server_command, "define", current_file, line('.'), col('.'), expand("<cword>")], " ")
  let locations = split(system(full_command), "\n")

  if len(locations) > 1
    cgete locations
  else
    echo locations[0]
    call JumpToFile(locations[0])
  endif

endfunction

function! EmberAlternate()
  let current_file = expand('%:p')
  let full_command = join([s:server_command, "alternate", current_file], " ")
  let new_path = system(full_command)
  echom new_path
  
  if current_file !=? new_path
    exec "edit ".new_path
  endif

endfunction

function! EmberParents()
  let current_file = expand('%:p')
  let full_command = join([s:server_command, "parents", current_file], " ")
  cgete system(full_command)
  cope

endfunction

function! EmberCheckTemplate()
  let current_file = expand('%:p')
  let full_command = join([s:server_command, "checkTemplate", current_file], " ")
  cgete system(full_command)
  cope

endfunction

function! EmberInvokedAttr()
  let current_file = expand('%:p')
  let full_command = join([s:server_command, "invokedAttr", current_file, line('.'), col('.'), expand("<cword>")], " ")
  echo full_command
  cgete system(full_command)
  cope

endfunction

function! EmberComponentNames(ArgLead, CmdLine, CursorPos)
  let full_command = join([s:server_command, "moduleNames", "component"], " ")
  return system(full_command)
endfunction

function! EmberTemplateNames(ArgLead, CmdLine, CursorPos)
  let full_command = join([s:server_command, "moduleNames", "template"], " ")
  return system(full_command)
endfunction

function! FindEmberComponent(componentName)
  let component_module = join(["component", a:componentName], ":")
  let full_command = join([s:server_command, "module", component_module], " ")

  let new_path = system(full_command)
  exec "edit ".new_path
endfunction

function! FindEmberTemplate(templateName)
  let template_module = join(["template", a:templateName], ":")
  let full_command = join([s:server_command, "module", template_module], " ")

  let new_path = system(full_command)
  exec "edit ".new_path
endfunction


command! -nargs=1 -complete=custom,EmberComponentNames EmberComponent call FindEmberComponent(<f-args>)
command! -nargs=1 -complete=custom,EmberTemplateNames EmberTemplate call FindEmberTemplate(<f-args>)

nnoremap <leader>fd :call EmberDef()<cr>
nnoremap <leader>fa :call EmberAlternate()<cr>
nnoremap <leader>fp :call EmberParents()<cr>
nnoremap <leader>fi :call EmberInvokedAttr()<cr>