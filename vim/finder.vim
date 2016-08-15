function! EmberDef()
  let def_command = "~/ember-analyzer/bin/cli"
  let current_file = expand('%:p')
  let full_command = join([def_command, "define", current_file, line('.'), col('.'), expand("<cword>")], " ")
  let location = system(full_command)
  echo location
  let segments = split(location, ":")

  let new_path = segments[0]
  if current_file !=? new_path
    exec "edit ".new_path
  endif

  if len(segments) > 1
    let line = segments[1]
    let column = segments[2]
    call cursor(line, column)
  else
    echom "No position in the file was found"
  endif

endfunction

function! EmberAlternate()
  let command_path = "sh ~/ember-analyzer/bin/cli"
  let current_file = expand('%:p')
  let full_command = join([command_path, "alternate", current_file], " ")
  let new_path = system(full_command)
  echom new_path
  
  if current_file !=? new_path
    exec "edit ".new_path
  endif

endfunction

function! EmberParents()
  let command_path = "sh ~/ember-analyzer/bin/cli"
  let current_file = expand('%:p')
  let full_command = join([command_path, "parents", current_file], " ")
  cgete system(full_command)
  cope

endfunction

function! EmberCheckTemplate()
  let command_path = "sh ~/ember-analyzer/bin/cli"
  let current_file = expand('%:p')
  let full_command = join([command_path, "checkTemplate", current_file], " ")
  cgete system(full_command)
  cope

endfunction

nnoremap <leader>fd :call EmberDef()<cr>
nnoremap <leader>fa :call EmberAlternate()<cr>
nnoremap <leader>fp :call EmberParents()<cr>