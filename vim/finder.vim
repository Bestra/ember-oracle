function! EmberDef()
  let def_command = "sh ~/ember-analyzer/bin/findDef.sh"
  let full_command = join([def_command, expand('%:p'), line('.'), col('.'), expand("<cword>")], " ")
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

nnoremap <leader>f :call EmberDef()<cr>