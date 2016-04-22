function! EmberDef()
  let def_command = "~/ember-analyzer/bin/cli"
  let current_file = expand('%:p')
  let full_command = join([def_command, "define", current_file, line('.'), col('.'), expand("<cword>")], " ")
  let location = system(full_command)
  echo location
  let segments = split(location, ":")
  let new_path = segments[0]
  let line = segments[1]
  let column = segments[2]

  if current_file !=? new_path
    exec "edit ".new_path
  endif

  call cursor(line, column)

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

nnoremap <leader>fd :call EmberDef()<cr>
nnoremap <leader>fa :call EmberAlternate()<cr>