# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
# Functions
_SUSEconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
__arguments () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
__atuin_search_cmd () {
	local -a search_args=("$@") 
	if __atuin_tmux_popup_check
	then
		__atuin_popup_tmpdir=$(mktemp -d)  || return 1
		local result_file="$__atuin_popup_tmpdir/result" 
		trap '__atuin_tmux_popup_cleanup' EXIT HUP INT TERM
		local escaped_query escaped_args
		escaped_query=$(printf '%s' "$BUFFER" | sed "s/'/'\\\\''/g") 
		escaped_args="" 
		for arg in "${search_args[@]}"
		do
			escaped_args+=" '$(printf '%s' "$arg" | sed "s/'/'\\\\''/g")'" 
		done
		local cdir popup_width popup_height
		cdir=$(pwd) 
		popup_width="${ATUIN_TMUX_POPUP_WIDTH:-80%}" 
		popup_height="${ATUIN_TMUX_POPUP_HEIGHT:-60%}" 
		tmux display-popup -d "$cdir" -w "$popup_width" -h "$popup_height" -E -E -- sh -c "PATH='$PATH' ATUIN_SESSION='$ATUIN_SESSION' ATUIN_SHELL=zsh ATUIN_LOG=error ATUIN_QUERY='$escaped_query' atuin search $escaped_args -i 2>'$result_file'"
		if [[ -f "$result_file" ]]
		then
			cat "$result_file"
		fi
		__atuin_tmux_popup_cleanup
		trap - EXIT HUP INT TERM
	else
		ATUIN_SHELL=zsh ATUIN_LOG=error ATUIN_QUERY=$BUFFER atuin search "${search_args[@]}" -i 3>&1 >&2 2>&3
	fi
}
__atuin_tmux_popup_check () {
	[[ -n "${TMUX-}" ]] || return 1
	[[ "${ATUIN_TMUX_POPUP:-true}" != "false" ]] || return 1
	local tmux_version
	tmux_version=$(tmux -V 2>/dev/null | sed -n 's/^[^0-9]*\([0-9][0-9]*\.[0-9][0-9]*\).*/\1/p') 
	[[ -z "$tmux_version" ]] && return 1
	local m1 m2
	m1=${tmux_version%%.*} 
	m2=${tmux_version#*.} 
	m2=${m2%%.*} 
	[[ "$m1" =~ ^[0-9]+$ ]] || return 1
	[[ "$m2" =~ ^[0-9]+$ ]] || m2=0 
	(( m1 > 3 || (m1 == 3 && m2 >= 2) ))
}
__atuin_tmux_popup_cleanup () {
	[[ -n "$__atuin_popup_tmpdir" && -d "$__atuin_popup_tmpdir" ]] && command rm -rf "$__atuin_popup_tmpdir"
	__atuin_popup_tmpdir="" 
}
__bun_dynamic_comp () {
	local comp="" 
	for arg in scripts
	do
		local line
		while read -r line
		do
			local name="$line" 
			local desc="$line" 
			name="${name%$'\t'*}" 
			desc="${desc/*$'\t'/}" 
			echo
		done <<< "$arg"
	done
	return $comp
}
__nvm () {
	declare previous_word
	previous_word="${COMP_WORDS[COMP_CWORD - 1]}" 
	case "${previous_word}" in
		(use | run | exec | ls | list | uninstall) __nvm_installed_nodes ;;
		(alias | unalias) __nvm_alias ;;
		(*) __nvm_commands ;;
	esac
	return 0
}
__nvm_alias () {
	__nvm_generate_completion "$(__nvm_aliases)"
}
__nvm_aliases () {
	declare aliases
	aliases="" 
	if [ -d "${NVM_DIR}/alias" ]
	then
		aliases="$(command cd "${NVM_DIR}/alias" && command find "${PWD}" -type f | command sed "s:${PWD}/::")" 
	fi
	echo "${aliases} node stable unstable iojs"
}
__nvm_commands () {
	declare current_word
	declare command
	current_word="${COMP_WORDS[COMP_CWORD]}" 
	COMMANDS='
    help install uninstall use run exec
    alias unalias reinstall-packages
    current list ls list-remote ls-remote
    install-latest-npm
    cache deactivate unload
    version version-remote which' 
	if [ ${#COMP_WORDS[@]} == 4 ]
	then
		command="${COMP_WORDS[COMP_CWORD - 2]}" 
		case "${command}" in
			(alias) __nvm_installed_nodes ;;
		esac
	else
		case "${current_word}" in
			(-*) __nvm_options ;;
			(*) __nvm_generate_completion "${COMMANDS}" ;;
		esac
	fi
}
__nvm_generate_completion () {
	declare current_word
	current_word="${COMP_WORDS[COMP_CWORD]}" 
	COMPREPLY=($(compgen -W "$1" -- "${current_word}")) 
	return 0
}
__nvm_installed_nodes () {
	__nvm_generate_completion "$(nvm_ls) $(__nvm_aliases)"
}
__nvm_options () {
	OPTIONS='' 
	__nvm_generate_completion "${OPTIONS}"
}
__starship_get_time () {
	(( STARSHIP_CAPTURED_TIME = int(rint(EPOCHREALTIME * 1000)) ))
}
_a2ps () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_a2utils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_aap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_abcde () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_absolute_command_paths () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ack () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_acpi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_acpitool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_acroread () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_adb () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_add-zle-hook-widget () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_add-zsh-hook () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_alias () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_aliases () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_all_labels () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_all_matches () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_alsa-utils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_alternative () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_analyseplugin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ansible () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ant () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_antiword () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_apachectl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_apm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_approximate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_apt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_apt-file () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_apt-move () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_apt-show-versions () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_aptitude () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arch_archives () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arch_namespace () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arg_compile () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arguments () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arping () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_arrays () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_asciidoctor () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_asciinema () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_assign () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_at () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_attr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_atuin () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_atuin_ai_cleanup () {
	true
}
_atuin_precmd () {
	local EXIT="$?" __atuin_precmd_time=${EPOCHREALTIME-} 
	[[ -z "${ATUIN_HISTORY_ID:-}" ]] && return
	local duration="" 
	if [[ -n $__atuin_preexec_time && -n $__atuin_precmd_time ]]
	then
		printf -v duration %.0f $(((__atuin_precmd_time - __atuin_preexec_time) * 1000000000))
	fi
	(
		ATUIN_LOG=error atuin history end --exit $EXIT ${duration:+--duration=$duration} -- $ATUIN_HISTORY_ID &
	) > /dev/null 2>&1
	export ATUIN_HISTORY_ID="" 
}
_atuin_preexec () {
	local id
	id=$(atuin history start -- "$1" 2>/dev/null) 
	export ATUIN_HISTORY_ID="$id" 
	__atuin_preexec_time=${EPOCHREALTIME-} 
}
_atuin_search () {
	emulate -L zsh
	zle -I
	local output
	output=$(__atuin_search_cmd $*) 
	zle reset-prompt
	echo -n ${zle_bracketed_paste[1]} > /dev/tty
	if [[ -n $output ]]
	then
		RBUFFER="" 
		LBUFFER=$output 
		if [[ $LBUFFER == __atuin_accept__:* ]]
		then
			LBUFFER=${LBUFFER#__atuin_accept__:} 
			zle accept-line
		fi
	fi
}
_atuin_search_vicmd () {
	_atuin_search --keymap-mode=vim-normal
}
_atuin_search_viins () {
	_atuin_search --keymap-mode=vim-insert
}
_atuin_up_search () {
	if [[ ! $BUFFER == *$'\n'* ]]
	then
		_atuin_search --shell-up-key-binding "$@"
	else
		zle up-line
	fi
}
_atuin_up_search_vicmd () {
	_atuin_up_search --keymap-mode=vim-normal
}
_atuin_up_search_viins () {
	_atuin_up_search --keymap-mode=vim-insert
}
_augeas () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_auto-apt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_autocd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_avahi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_awk () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_aws () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_axi-cache () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_base64 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_basename () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_basenc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bash () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bash_complete () {
	local ret=1 
	local -a suf matches
	local -x COMP_POINT COMP_CWORD
	local -a COMP_WORDS COMPREPLY BASH_VERSINFO
	local -x COMP_LINE="$words" 
	local -A savejobstates savejobtexts
	(( COMP_POINT = 1 + ${#${(j. .)words[1,CURRENT-1]}} + $#QIPREFIX + $#IPREFIX + $#PREFIX ))
	(( COMP_CWORD = CURRENT - 1))
	COMP_WORDS=("${words[@]}") 
	BASH_VERSINFO=(2 05b 0 1 release) 
	savejobstates=(${(kv)jobstates}) 
	savejobtexts=(${(kv)jobtexts}) 
	[[ ${argv[${argv[(I)nospace]:-0}-1]} = -o ]] && suf=(-S '') 
	matches=(${(f)"$(compgen $@ -- ${words[CURRENT]})"}) 
	if [[ -n $matches ]]
	then
		if [[ ${argv[${argv[(I)filenames]:-0}-1]} = -o ]]
		then
			compset -P '*/' && matches=(${matches##*/}) 
			compset -S '/*' && matches=(${matches%%/*}) 
			compadd -f "${suf[@]}" -a matches && ret=0 
		else
			compadd "${suf[@]}" - "${(@)${(Q@)matches}:#*\ }" && ret=0 
			compadd -S ' ' - ${${(M)${(Q)matches}:#*\ }% } && ret=0 
		fi
	fi
	if (( ret ))
	then
		if [[ ${argv[${argv[(I)default]:-0}-1]} = -o ]]
		then
			_default "${suf[@]}" && ret=0 
		elif [[ ${argv[${argv[(I)dirnames]:-0}-1]} = -o ]]
		then
			_directories "${suf[@]}" && ret=0 
		fi
	fi
	return ret
}
_bash_completions () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_baudrates () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_baz () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_be_name () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_beadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_beep () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bibtex () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bind_addresses () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bindkey () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bison () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bittorrent () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bogofilter () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bpf_filters () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bpython () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_brace_parameter () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_brctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_brew () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_bsd_disks () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bsd_pkg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bsdconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bsdinstall () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_btrfs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bug () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_builtin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bun () {
	zstyle ':completion:*:*:bun:*' group-name ''
	zstyle ':completion:*:*:bun-grouped:*' group-name ''
	zstyle ':completion:*:*:bun::descriptions' format '%F{green}-- %d --%f'
	zstyle ':completion:*:*:bun-grouped:*' format '%F{green}-- %d --%f'
	local program=bun 
	typeset -A opt_args
	local curcontext="$curcontext" state line context 
	_arguments -s '1: :->cmd' '*: :->args' && ret=0 
	case $state in
		(cmd) local -a scripts_list
			IFS=$'\n' scripts_list=($(SHELL=zsh bun getcompletes i)) 
			scripts="scripts:scripts:((${scripts_list//:/\\\\:}))" 
			IFS=$'\n' files_list=($(SHELL=zsh bun getcompletes j)) 
			main_commands=('run\:"Run JavaScript with Bun, a package.json script, or a bin" ' 'test\:"Run unit tests with Bun" ' 'x\:"Install and execute a package bin (bunx)" ' 'repl\:"Start a REPL session with Bun" ' 'init\:"Start an empty Bun project from a blank template" ' 'create\:"Create a new project from a template (bun c)" ' 'install\:"Install dependencies for a package.json (bun i)" ' 'add\:"Add a dependency to package.json (bun a)" ' 'remove\:"Remove a dependency from package.json (bun rm)" ' 'update\:"Update outdated dependencies & save to package.json" ' 'outdated\:"Display the latest versions of outdated dependencies" ' 'link\:"Link an npm package globally" ' 'unlink\:"Globally unlink an npm package" ' 'pm\:"More commands for managing packages" ' 'build\:"Bundle TypeScript & JavaScript into a single file" ' 'upgrade\:"Get the latest version of bun" ' 'help\:"Show all supported flags and commands" ') 
			main_commands=($main_commands) 
			_alternative "$scripts" "args:command:(($main_commands))" "files:files:(($files_list))" ;;
		(args) case $line[1] in
				(add | a) _bun_add_completion ;;
				(unlink) _bun_unlink_completion ;;
				(link) _bun_link_completion ;;
				(bun) _bun_bun_completion ;;
				(init) _bun_init_completion ;;
				(create | c) _bun_create_completion ;;
				(x) _arguments -s -C '1: :->cmd' '2: :->cmd2' '*: :->args' && ret=0  ;;
				(pm) _bun_pm_completion ;;
				(install | i) _bun_install_completion ;;
				(remove | rm) _bun_remove_completion ;;
				(run) _bun_run_completion ;;
				(upgrade) _bun_upgrade_completion ;;
				(build) _bun_build_completion ;;
				(update) _bun_update_completion ;;
				(outdated) _bun_outdated_completion ;;
				('test') _bun_test_completion ;;
				(help) _arguments -s -C '1: :->cmd' '2: :->cmd2' '*: :->args' && ret=0 
					case $state in
						(cmd2) curcontext="${curcontext%:*:*}:bun-grouped" 
							_alternative "args:command:(($main_commands))" ;;
						(args) case $line[2] in
								(add) _bun_add_completion ;;
								(unlink) _bun_unlink_completion ;;
								(link) _bun_link_completion ;;
								(bun) _bun_bun_completion ;;
								(init) _bun_init_completion ;;
								(create) _bun_create_completion ;;
								(x) _arguments -s -C '1: :->cmd' '2: :->cmd2' '*: :->args' && ret=0  ;;
								(pm) _bun_pm_completion ;;
								(install) _bun_install_completion ;;
								(remove) _bun_remove_completion ;;
								(run) _bun_run_completion ;;
								(upgrade) _bun_upgrade_completion ;;
								(build) _bun_build_completion ;;
								(update) _bun_update_completion ;;
								(outdated) _bun_outdated_completion ;;
								('test') _bun_test_completion ;;
							esac ;;
					esac ;;
			esac ;;
	esac
}
_bun_add_completion () {
	_arguments -s -C '1: :->cmd1' '*: :->package' '--config[Load config(bunfig.toml)]: :->config' '-c[Load config(bunfig.toml)]: :->config' '--yarn[Write a yarn.lock file (yarn v1)]' '-y[Write a yarn.lock file (yarn v1)]' '--production[Don'"'"'t install devDependencies]' '-p[Don'"'"'t install devDependencies]' '--no-save[Don'"'"'t save a lockfile]' '--save[Save to package.json]' '--dry-run[Don'"'"'t install anything]' '--frozen-lockfile[Disallow changes to lockfile]' '--force[Always request the latest versions from the registry & reinstall all dependencies]' '-f[Always request the latest versions from the registry & reinstall all dependencies]' '--cache-dir[Store & load cached data from a specific directory path]:cache-dir' '--no-cache[Ignore manifest cache entirely]' '--silent[Don'"'"'t log anything]' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--no-summary[Don'"'"'t print a summary]' '--no-verify[Skip verifying integrity of newly downloaded packages]' '--ignore-scripts[Skip lifecycle scripts in the package.json (dependency scripts are never run)]' '--global[Add a package globally]' '-g[Add a package globally]' '--cwd[Set a specific cwd]:cwd' '--backend[Platform-specific optimizations for installing dependencies]:backend:("copyfile" "hardlink" "symlink")' '--link-native-bins[Link "bin" from a matching platform-specific dependency instead. Default: esbuild, turbo]:link-native-bins' '--help[Print this help menu]' '--dev[Add dependence to "devDependencies]' '-d[Add dependence to "devDependencies]' '-D[]' '--development[]' '--optional[Add dependency to "optionalDependencies]' '--peer[Add dependency to "peerDependencies]' '--exact[Add the exact version instead of the ^range]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
		(package) _bun_add_param_package_completion ;;
	esac
}
_bun_add_param_package_completion () {
	IFS=$'\n' inexact=($(history -n bun | grep -E "^bun add " | cut -c 9- | uniq)) 
	IFS=$'\n' exact=($($inexact | grep -E "^$words[$CURRENT]")) 
	IFS=$'\n' packages=($(SHELL=zsh bun getcompletes a $words[$CURRENT])) 
	to_print=$inexact 
	if [ ! -z "$exact" -a "$exact" != " " ]
	then
		to_print=$exact 
	fi
	if [ ! -z "$to_print" -a "$to_print" != " " ]
	then
		if [ ! -z "$packages" -a "$packages" != " " ]
		then
			_describe -1 -t to_print 'History' to_print
			_describe -1 -t packages "Popular" packages
			return
		fi
		_describe -1 -t to_print 'History' to_print
		return
	fi
	if [ ! -z "$packages" -a "$packages" != " " ]
	then
		_describe -1 -t packages "Popular" packages
		return
	fi
}
_bun_build_completion () {
	_arguments -s -C '1: :->cmd' '*: :->file' '--outfile[Write the output to a specific file (default: stdout)]:outfile' '--outdir[Write the output to a directory (required for splitting)]:outdir' '--minify[Enable all minification flags]' '--minify-whitespace[Remove unneeded whitespace]' '--minify-syntax[Transform code to use less syntax]' '--minify-identifiers[Shorten variable names]' '--sourcemap[Generate sourcemaps]: :->sourcemap' '--target[The intended execution environment for the bundle. "browser", "bun" or "node"]: :->target' '--splitting[Whether to enable code splitting (requires --outdir)]' '--compile[generating a standalone binary from a TypeScript or JavaScript file]' '--format[Specifies the module format to be used in the generated bundles]: :->format' && ret=0 
	case $state in
		(file) _files ;;
		(target) _alternative 'args:cmd3:((browser bun node))' ;;
		(sourcemap) _alternative 'args:cmd3:((none external inline))' ;;
		(format) _alternative 'args:cmd3:((esm cjs iife))' ;;
	esac
}
_bun_bun_completion () {
	_arguments -s -C '1: :->cmd' '*: :->file' '--version[Show version and exit]' '-V[Show version and exit]' '--cwd[Change directory]:cwd' '--help[Show command help]' '-h[Show command help]' '--use[Use a framework, e.g. "next"]:use' && ret=0 
	case $state in
		(file) _files ;;
	esac
}
_bun_create_completion () {
	_arguments -s -C '1: :->cmd' '2: :->cmd2' '*: :->args' && ret=0 
	case $state in
		(cmd2) _alternative 'args:create:((next-app\:"Next.js app" react-app\:"React app"))' ;;
		(args) case $line[2] in
				(next) pmargs=('1: :->cmd' '2: :->cmd2' '3: :->file' '--force[Overwrite existing files]' '--no-install[Don'"'"'t install node_modules]' '--no-git[Don'"'"'t create a git repository]' '--verbose[verbose]' '--no-package-json[Disable package.json transforms]' '--open[On finish, start bun & open in-browser]') 
					_arguments -s -C $pmargs && ret=0 
					case $state in
						(file) _files ;;
					esac ;;
				(react) _arguments -s -C $pmargs && ret=0 
					case $state in
						(file) _files ;;
					esac ;;
				(*) _arguments -s -C $pmargs && ret=0 
					case $state in
						(file) _files ;;
					esac ;;
			esac ;;
	esac
}
_bun_init_completion () {
	_arguments -s -C '1: :->cmd' '-y[Answer yes to all prompts]:' '--yes[Answer yes to all prompts]:' && ret=0 
}
_bun_install_completion () {
	_arguments -s -C '1: :->cmd1' '--config[Load config(bunfig.toml)]: :->config' '-c[Load config(bunfig.toml)]: :->config' '--yarn[Write a yarn.lock file (yarn v1)]' '-y[Write a yarn.lock file (yarn v1)]' '--production[Don'"'"'t install devDependencies]' '-p[Don'"'"'t install devDependencies]' '--no-save[Don'"'"'t save a lockfile]' '--save[Save to package.json]' '--dry-run[Don'"'"'t install anything]' '--frozen-lockfile[Disallow changes to lockfile]' '--force[Always request the latest versions from the registry & reinstall all dependencies]' '-f[Always request the latest versions from the registry & reinstall all dependencies]' '--cache-dir[Store & load cached data from a specific directory path]:cache-dir' '--no-cache[Ignore manifest cache entirely]' '--silent[Don'"'"'t log anything]' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--no-summary[Don'"'"'t print a summary]' '--no-verify[Skip verifying integrity of newly downloaded packages]' '--ignore-scripts[Skip lifecycle scripts in the package.json (dependency scripts are never run)]' '--global[Add a package globally]' '-g[Add a package globally]' '--cwd[Set a specific cwd]:cwd' '--backend[Platform-specific optimizations for installing dependencies]:backend:("copyfile" "hardlink" "symlink")' '--link-native-bins[Link "bin" from a matching platform-specific dependency instead. Default: esbuild, turbo]:link-native-bins' '--help[Print this help menu]' '--dev[Add dependence to "devDependencies]' '-d[Add dependence to "devDependencies]' '--development[]' '-D[]' '--optional[Add dependency to "optionalDependencies]' '--peer[Add dependency to "peerDependencies]' '--exact[Add the exact version instead of the ^range]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
	esac
}
_bun_link_completion () {
	_arguments -s -C '1: :->cmd1' '*: :->package' '--config[Load config(bunfig.toml)]: :->config' '-c[Load config(bunfig.toml)]: :->config' '--yarn[Write a yarn.lock file (yarn v1)]' '-y[Write a yarn.lock file (yarn v1)]' '--production[Don'"'"'t install devDependencies]' '-p[Don'"'"'t install devDependencies]' '--no-save[Don'"'"'t save a lockfile]' '--save[Save to package.json]' '--dry-run[Don'"'"'t install anything]' '--frozen-lockfile[Disallow changes to lockfile]' '--force[Always request the latest versions from the registry & reinstall all dependencies]' '-f[Always request the latest versions from the registry & reinstall all dependencies]' '--cache-dir[Store & load cached data from a specific directory path]:cache-dir' '--no-cache[Ignore manifest cache entirely]' '--silent[Don'"'"'t log anything]' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--no-summary[Don'"'"'t print a summary]' '--no-verify[Skip verifying integrity of newly downloaded packages]' '--ignore-scripts[Skip lifecycle scripts in the package.json (dependency scripts are never run)]' '--global[Add a package globally]' '-g[Add a package globally]' '--cwd[Set a specific cwd]:cwd' '--backend[Platform-specific optimizations for installing dependencies]:backend:("copyfile" "hardlink" "symlink")' '--link-native-bins[Link "bin" from a matching platform-specific dependency instead. Default: esbuild, turbo]:link-native-bins' '--help[Print this help menu]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
		(package) _bun_link_param_package_completion ;;
	esac
}
_bun_link_param_package_completion () {
	install_env=$BUN_INSTALL 
	install_dir=${(P)install_env:-$HOME/.bun} 
	global_node_modules=$install_dir/install/global/node_modules 
	local -a packages_full_path=(${global_node_modules}/*(N)) 
	packages=$(echo $packages_full_path | tr ' ' '\n' | xargs  basename) 
	_alternative "dirs:directory:(($packages))"
}
_bun_list_bunfig_toml () {
	_files
}
_bun_outdated_completion () {
	_arguments -s -C '--cwd[Set a specific cwd]:cwd' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--help[Print this help menu]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
	esac
}
_bun_pm_completion () {
	_arguments -s -C '1: :->cmd' '2: :->cmd2' '*: :->args' && ret=0 
	case $state in
		(cmd2) sub_commands=('bin\:"print the path to bin folder" ' 'ls\:"list the dependency tree according to the current lockfile" ' 'hash\:"generate & print the hash of the current lockfile" ' 'hash-string\:"print the string used to hash the lockfile" ' 'hash-print\:"print the hash stored in the current lockfile" ' 'audit\:"run a security audit of dependencies in Bun'\''s lockfile"' 'cache\:"print the path to the cache folder" ') 
			_alternative "args:cmd3:(($sub_commands))" ;;
		(args) case $line[2] in
				(cache) _arguments -s -C '1: :->cmd' '2: :->cmd2' ':::(rm)' && ret=0  ;;
				(bin) pmargs=("-g[print the global path to bin folder]") 
					_arguments -s -C '1: :->cmd' '2: :->cmd2' $pmargs && ret=0  ;;
				(ls) pmargs=("--all[list the entire dependency tree according to the current lockfile]") 
					_arguments -s -C '1: :->cmd' '2: :->cmd2' $pmargs && ret=0  ;;
			esac ;;
	esac
}
_bun_remove_completion () {
	_arguments -s -C '1: :->cmd1' '*: :->package' '--config[Load config(bunfig.toml)]: :->config' '-c[Load config(bunfig.toml)]: :->config' '--yarn[Write a yarn.lock file (yarn v1)]' '-y[Write a yarn.lock file (yarn v1)]' '--production[Don'"'"'t install devDependencies]' '-p[Don'"'"'t install devDependencies]' '--no-save[Don'"'"'t save a lockfile]' '--save[Save to package.json]' '--dry-run[Don'"'"'t install anything]' '--frozen-lockfile[Disallow changes to lockfile]' '--force[Always request the latest versions from the registry & reinstall all dependencies]' '-f[Always request the latest versions from the registry & reinstall all dependencies]' '--cache-dir[Store & load cached data from a specific directory path]:cache-dir' '--no-cache[Ignore manifest cache entirely]' '--silent[Don'"'"'t log anything]' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--no-summary[Don'"'"'t print a summary]' '--no-verify[Skip verifying integrity of newly downloaded packages]' '--ignore-scripts[Skip lifecycle scripts in the package.json (dependency scripts are never run)]' '--global[Add a package globally]' '-g[Add a package globally]' '--cwd[Set a specific cwd]:cwd' '--backend[Platform-specific optimizations for installing dependencies]:backend:("copyfile" "hardlink" "symlink")' '--link-native-bins[Link "bin" from a matching platform-specific dependency instead. Default: esbuild, turbo]:link-native-bins' '--help[Print this help menu]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
		(package) _bun_remove_param_package_completion ;;
	esac
}
_bun_remove_param_package_completion () {
	if ! command -v jq &> /dev/null
	then
		return
	fi
	if [ -f "package.json" ]
	then
		local dependencies=$(jq -r '.dependencies | keys[]' package.json) 
		local dev_dependencies=$(jq -r '.devDependencies | keys[]' package.json) 
		_alternative "deps:dependency:(($dependencies))"
		_alternative "deps:dependency:(($dev_dependencies))"
	fi
}
_bun_run_completion () {
	_arguments -s -C '1: :->cmd' '2: :->script' '*: :->other' '--help[Display this help and exit]' '-h[Display this help and exit]' '--bun[Force a script or package to use Bun'"'"'s runtime instead of Node.js (via symlinking node)]' '-b[Force a script or package to use Bun'"'"'s runtime instead of Node.js (via symlinking node)]' '--cwd[Absolute path to resolve files & entry points from. This just changes the process cwd]:cwd' '--config[Config file to load bun from (e.g. -c bunfig.toml]: :->config' '-c[Config file to load bun from (e.g. -c bunfig.toml]: :->config' '--env-file[Load environment variables from the specified file(s)]:env-file' '--extension-order[Defaults to: .tsx,.ts,.jsx,.js,.json]:extension-order' '--jsx-factory[Changes the function called when compiling JSX elements using the classic JSX runtime]:jsx-factory' '--jsx-fragment[Changes the function called when compiling JSX fragments]:jsx-fragment' '--jsx-import-source[Declares the module specifier to be used for importing the jsx and jsxs factory functions. Default: "react"]:jsx-import-source' '--jsx-runtime["automatic" (default) or "classic"]: :->jsx-runtime' '--preload[Import a module before other modules are loaded]:preload' '-r[Import a module before other modules are loaded]:preload' '--main-fields[Main fields to lookup in package.json. Defaults to --target dependent]:main-fields' '--no-summary[Don'"'"'t print a summary]' '--version[Print version and exit]' '-v[Print version and exit]' '--revision[Print version with revision and exit]' '--tsconfig-override[Load tsconfig from path instead of cwd/tsconfig.json]:tsconfig-override' '--define[Substitute K:V while parsing, e.g. --define process.env.NODE_ENV:"development". Values are parsed as JSON.]:define' '-d[Substitute K:V while parsing, e.g. --define process.env.NODE_ENV:"development". Values are parsed as JSON.]:define' '--external[Exclude module from transpilation (can use * wildcards). ex: -e react]:external' '-e[Exclude module from transpilation (can use * wildcards). ex: -e react]:external' '--loader[Parse files with .ext:loader, e.g. --loader .js:jsx. Valid loaders: js, jsx, ts, tsx, json, toml, text, file, wasm, napi]:loader' '--packages[Exclude dependencies from bundle, e.g. --packages external. Valid options: bundle, external]:packages' '-l[Parse files with .ext:loader, e.g. --loader .js:jsx. Valid loaders: js, jsx, ts, tsx, json, toml, text, file, wasm, napi]:loader' '--origin[Rewrite import URLs to start with --origin. Default: ""]:origin' '-u[Rewrite import URLs to start with --origin. Default: ""]:origin' '--port[Port to serve bun'"'"'s dev server on. Default: '"'"'3000'"'"']:port' '-p[Port to serve bun'"'"'s dev server on. Default: '"'"'3000'"'"']:port' '--smol[Use less memory, but run garbage collection more often]' '--minify[Minify (experimental)]' '--minify-syntax[Minify syntax and inline data (experimental)]' '--minify-whitespace[Minify Whitespace (experimental)]' '--minify-identifiers[Minify identifiers]' '--no-macros[Disable macros from being executed in the bundler, transpiler and runtime]' '--target[The intended execution environment for the bundle. "browser", "bun" or "node"]: :->target' '--inspect[Activate Bun'"'"'s Debugger]:inspect' '--inspect-wait[Activate Bun'"'"'s Debugger, wait for a connection before executing]:inspect-wait' '--inspect-brk[Activate Bun'"'"'s Debugger, set breakpoint on first line of code and wait]:inspect-brk' '--hot[Enable auto reload in bun'"'"'s JavaScript runtime]' '--watch[Automatically restart bun'"'"'s JavaScript runtime on file change]' '--no-install[Disable auto install in bun'"'"'s JavaScript runtime]' '--install[Install dependencies automatically when no node_modules are present, default: "auto". "force" to ignore node_modules, fallback to install any missing]: :->install_' '-i[Automatically install dependencies and use global cache in bun'"'"'s runtime, equivalent to --install=fallback'] '--prefer-offline[Skip staleness checks for packages in bun'"'"'s JavaScript runtime and resolve from disk]' '--prefer-latest[Use the latest matching versions of packages in bun'"'"'s JavaScript runtime, always checking npm]' '--silent[Don'"'"'t repeat the command for bun run]' '--dump-environment-variables[Dump environment variables from .env and process as JSON and quit. Useful for debugging]' '--dump-limits[Dump system limits. Userful for debugging]' && ret=0 
	case $state in
		(script) curcontext="${curcontext%:*:*}:bun-grouped" 
			_bun_run_param_script_completion ;;
		(jsx-runtime) _alternative 'args:cmd3:((classic automatic))' ;;
		(target) _alternative 'args:cmd3:((browser bun node))' ;;
		(install_) _alternative 'args:cmd3:((auto force fallback))' ;;
		(other) _files ;;
	esac
}
_bun_run_param_script_completion () {
	local -a scripts_list
	IFS=$'\n' scripts_list=($(SHELL=zsh bun getcompletes s)) 
	IFS=$'\n' bins=($(SHELL=zsh bun getcompletes b)) 
	_alternative "scripts:scripts:((${scripts_list//:/\\\\:}))"
	_alternative "bin:bin:((${bins//:/\\\\:}))"
	_alternative "files:file:_files -g '*.(js|ts|jsx|tsx|wasm)'"
}
_bun_test_completion () {
	_arguments -s -C '1: :->cmd1' '*: :->file' '-h[Display this help and exit]' '--help[Display this help and exit]' '-b[Force a script or package to use Bun.js instead of Node.js (via symlinking node)]' '--bun[Force a script or package to use Bun.js instead of Node.js (via symlinking node)]' '--cwd[Set a specific cwd]:cwd' '-c[Load config(bunfig.toml)]: :->config' '--config[Load config(bunfig.toml)]: :->config' '--env-file[Load environment variables from the specified file(s)]:env-file' '--extension-order[Defaults to: .tsx,.ts,.jsx,.js,.json]:extension-order' '--jsx-factory[Changes the function called when compiling JSX elements using the classic JSX runtime]:jsx-factory' '--jsx-fragment[Changes the function called when compiling JSX fragments]:jsx-fragment' '--jsx-import-source[Declares the module specifier to be used for importing the jsx and jsxs factory functions. Default: "react"]:jsx-import-source' '--jsx-runtime["automatic" (default) or "classic"]: :->jsx-runtime' '--preload[Import a module before other modules are loaded]:preload' '-r[Import a module before other modules are loaded]:preload' '--main-fields[Main fields to lookup in package.json. Defaults to --target dependent]:main-fields' '--no-summary[Don'"'"'t print a summary]' '--version[Print version and exit]' '-v[Print version and exit]' '--revision[Print version with revision and exit]' '--tsconfig-override[Load tsconfig from path instead of cwd/tsconfig.json]:tsconfig-override' '--define[Substitute K:V while parsing, e.g. --define process.env.NODE_ENV:"development". Values are parsed as JSON.]:define' '-d[Substitute K:V while parsing, e.g. --define process.env.NODE_ENV:"development". Values are parsed as JSON.]:define' '--external[Exclude module from transpilation (can use * wildcards). ex: -e react]:external' '-e[Exclude module from transpilation (can use * wildcards). ex: -e react]:external' '--loader[Parse files with .ext:loader, e.g. --loader .js:jsx. Valid loaders: js, jsx, ts, tsx, json, toml, text, file, wasm, napi]:loader' '-l[Parse files with .ext:loader, e.g. --loader .js:jsx. Valid loaders: js, jsx, ts, tsx, json, toml, text, file, wasm, napi]:loader' '--origin[Rewrite import URLs to start with --origin. Default: ""]:origin' '-u[Rewrite import URLs to start with --origin. Default: ""]:origin' '--port[Port to serve bun'"'"'s dev server on. Default: '"'"'3000'"'"']:port' '-p[Port to serve bun'"'"'s dev server on. Default: '"'"'3000'"'"']:port' '--smol[Use less memory, but run garbage collection more often]' '--minify[Minify (experimental)]' '--minify-syntax[Minify syntax and inline data (experimental)]' '--minify-identifiers[Minify identifiers]' '--no-macros[Disable macros from being executed in the bundler, transpiler and runtime]' '--target[The intended execution environment for the bundle. "browser", "bun" or "node"]: :->target' '--inspect[Activate Bun'"'"'s Debugger]:inspect' '--inspect-wait[Activate Bun'"'"'s Debugger, wait for a connection before executing]:inspect-wait' '--inspect-brk[Activate Bun'"'"'s Debugger, set breakpoint on first line of code and wait]:inspect-brk' '--watch[Automatically restart bun'"'"'s JavaScript runtime on file change]' '--timeout[Set the per-test timeout in milliseconds, default is 5000.]:timeout' '--update-snapshots[Update snapshot files]' '--rerun-each[Re-run each test file <NUMBER> times, helps catch certain bugs]:rerun' '--only[Only run tests that are marked with "test.only()"]' '--todo[Include tests that are marked with "test.todo()"]' '--coverage[Generate a coverage profile]' '--bail[Exit the test suite after <NUMBER> failures. If you do not specify a number, it defaults to 1.]:bail' '--test-name-pattern[Run only tests with a name that matches the given regex]:pattern' '-t[Run only tests with a name that matches the given regex]:pattern' && ret=0 
	case $state in
		(file) _bun_test_param_script_completion ;;
		(config) _files ;;
	esac
}
_bun_test_param_script_completion () {
	local -a scripts_list
	_alternative "files:file:_files -g '*(_|.)(test|spec).(js|ts|jsx|tsx)'"
}
_bun_unlink_completion () {
	_arguments -s -C '1: :->cmd1' '*: :->package' '--config[Load config(bunfig.toml)]: :->config' '-c[Load config(bunfig.toml)]: :->config' '--yarn[Write a yarn.lock file (yarn v1)]' '-y[Write a yarn.lock file (yarn v1)]' '--production[Don'"'"'t install devDependencies]' '-p[Don'"'"'t install devDependencies]' '--no-save[Don'"'"'t save a lockfile]' '--save[Save to package.json]' '--dry-run[Don'"'"'t install anything]' '--frozen-lockfile[Disallow changes to lockfile]' '--force[Always request the latest versions from the registry & reinstall all dependencies]' '-f[Always request the latest versions from the registry & reinstall all dependencies]' '--cache-dir[Store & load cached data from a specific directory path]:cache-dir' '--no-cache[Ignore manifest cache entirely]' '--silent[Don'"'"'t log anything]' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--no-summary[Don'"'"'t print a summary]' '--no-verify[Skip verifying integrity of newly downloaded packages]' '--ignore-scripts[Skip lifecycle scripts in the package.json (dependency scripts are never run)]' '--global[Add a package globally]' '-g[Add a package globally]' '--cwd[Set a specific cwd]:cwd' '--backend[Platform-specific optimizations for installing dependencies]:backend:("copyfile" "hardlink" "symlink")' '--link-native-bins[Link "bin" from a matching platform-specific dependency instead. Default: esbuild, turbo]:link-native-bins' '--help[Print this help menu]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
		(package)  ;;
	esac
}
_bun_update_completion () {
	_arguments -s -C '1: :->cmd1' '-c[Load config(bunfig.toml)]: :->config' '--config[Load config(bunfig.toml)]: :->config' '-y[Write a yarn.lock file (yarn v1)]' '--yarn[Write a yarn.lock file (yarn v1)]' '-p[Don'"'"'t install devDependencies]' '--production[Don'"'"'t install devDependencies]' '--no-save[Don'"'"'t save a lockfile]' '--save[Save to package.json]' '--dry-run[Don'"'"'t install anything]' '--frozen-lockfile[Disallow changes to lockfile]' '-f[Always request the latest versions from the registry & reinstall all dependencies]' '--force[Always request the latest versions from the registry & reinstall all dependencies]' '--cache-dir[Store & load cached data from a specific directory path]:cache-dir' '--no-cache[Ignore manifest cache entirely]' '--silent[Don'"'"'t log anything]' '--verbose[Excessively verbose logging]' '--no-progress[Disable the progress bar]' '--no-summary[Don'"'"'t print a summary]' '--no-verify[Skip verifying integrity of newly downloaded packages]' '--ignore-scripts[Skip lifecycle scripts in the package.json (dependency scripts are never run)]' '-g[Add a package globally]' '--global[Add a package globally]' '--cwd[Set a specific cwd]:cwd' '--backend[Platform-specific optimizations for installing dependencies]:backend:("copyfile" "hardlink" "symlink")' '--link-native-bins[Link "bin" from a matching platform-specific dependency instead. Default: esbuild, turbo]:link-native-bins' '--help[Print this help menu]' && ret=0 
	case $state in
		(config) _bun_list_bunfig_toml ;;
	esac
}
_bun_upgrade_completion () {
	_arguments -s -C '1: :->cmd' '--canary[Upgrade to canary build]' && ret=0 
}
_bzip2 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_bzr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cabal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cache_invalid () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_caffeinate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_calendar () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_call_function () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_call_program () {
	local -xi COLUMNS=999 
	local curcontext="${curcontext}" tmp err_fd=-1 clocale='_comp_locale;' 
	local -a prefix
	if [[ "$1" = -p ]]
	then
		shift
		if (( $#_comp_priv_prefix ))
		then
			curcontext="${curcontext%:*}/${${(@M)_comp_priv_prefix:#^*[^\\]=*}[1]}:" 
			zstyle -t ":completion:${curcontext}:${1}" gain-privileges && prefix=($_comp_priv_prefix) 
		fi
	elif [[ "$1" = -l ]]
	then
		shift
		clocale='' 
	fi
	if (( ${debug_fd:--1} > 2 )) || [[ ! -t 2 ]]
	then
		exec {err_fd}>&2
	else
		exec {err_fd}> /dev/null
	fi
	{
		if zstyle -s ":completion:${curcontext}:${1}" command tmp
		then
			if [[ "$tmp" = -* ]]
			then
				eval $clocale "$tmp[2,-1]" "$argv[2,-1]"
			else
				eval $clocale $prefix "$tmp"
			fi
		else
			eval $clocale $prefix "$argv[2,-1]"
		fi 2>&$err_fd
	} always {
		exec {err_fd}>&-
	}
}
_canonical_paths () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_capabilities () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ccal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cdbs-edit-patch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cdcd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cdr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cdrdao () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cdrecord () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chattr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chcon () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chflags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chkconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chmod () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_choom () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chown () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chroot () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chrt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_chsh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cksum () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_clay () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cmdambivalent () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cmdstring () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cmp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_code () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_colima () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_column () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_combination () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_comm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_command () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_command_names () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_comp_locale () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_compadd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_compdef () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_complete () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_complete_debug () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_complete_help () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_complete_help_generic () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_complete_tag () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_completers () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_composer () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_compress () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_condition () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_configure () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_coreadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_correct () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_correct_filename () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_correct_word () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cowsay () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cpio () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cplay () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cpupower () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_crontab () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cryptsetup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cscope () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_csplit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cssh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_csup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ctags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ctags_tags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cu () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_curl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cut () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cvs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cvsup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cygcheck () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cygpath () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cygrunsrv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cygserver () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_cygstart () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dak () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_darcs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_date () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_date_formats () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dates () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dbus () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dchroot () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dchroot-dsa () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dconf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dcop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dcut () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_deb_architectures () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_deb_codenames () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_deb_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_deb_packages () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debbugs_bugnumber () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debchange () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debcheckout () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debdiff () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debfoster () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_deborphan () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debsign () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debsnap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_debuild () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_default () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_defaults () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_delimiters () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_deno () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_describe () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_description () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_devtodo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_df () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dhclient () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dhcpinfo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dict () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dict_words () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_diff () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_diff3 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_diff_options () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_diffstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dir_list () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_directories () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_directory_stack () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_direnv_hook () {
	trap -- '' SIGINT
	eval "$("/opt/homebrew/bin/direnv" export zsh)"
	trap - SIGINT
}
_dirs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_disable () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dispatch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_django () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dkms () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dladm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dlocate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dmesg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dmidecode () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dnf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dns_types () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_doas () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_doctl () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_domains () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dos2unix () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dpatch-edit-patch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dpkg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dpkg-buildpackage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dpkg-cross () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dpkg-repack () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dpkg_source () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dput () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_drill () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dropbox () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dscverify () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dsh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dtrace () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dtruss () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_du () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dumpadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dumper () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dupload () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dvi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_dynamic_directory_name () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_e2label () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ecasound () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_echotc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_echoti () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ed () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_elfdump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_elinks () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_email_addresses () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_emulate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_enable () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_enscript () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_entr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_env () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_eog () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_equal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_espeak () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_etags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ethtool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_evince () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_exec () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_expand () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_expand_alias () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_expand_word () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_extensions () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_external_pwds () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fakeroot () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fbsd_architectures () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fbsd_device_types () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_feh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fetch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fetchmail () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ffmpeg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_figlet () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_file_descriptors () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_file_flags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_file_modes () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_file_systems () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_find () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_find_net_interfaces () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_findmnt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_finger () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fink () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_first () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_flac () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_flex () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_floppy () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_flowadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fmadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fmt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fold () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fortune () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_free () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_freebsd-update () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fs_usage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fsh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_functions () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fuse_arguments () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fuse_values () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fuser () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fusermount () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_fw_update () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gcc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gcore () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gdb () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_geany () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gem () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_generic () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_genisoimage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_getclip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_getconf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_getent () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_getfacl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_getmail () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_getopt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gh () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_ghostscript () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ghq () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_git () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_git-buildpackage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_git-lfs () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_gitleaks () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_global () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_global_tags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_globflags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_globqual_delims () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_globquals () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gnome-gv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gnu_generic () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gnupod () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gnutls () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_go () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gpasswd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gpg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gphoto2 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gprof () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gqview () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gradle () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_graphicsmagick () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_grep () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_grep-excuses () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_groff () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_groups () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_growisofs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gsettings () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_guard () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_guilt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_gzip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_hash () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_have_glob_qual () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_hdiutil () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_head () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_hexdump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_himalaya () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_history () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_history_complete_word () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_history_modifiers () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_host () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_hostname () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_hosts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_htop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_hwinfo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_iconv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_iconvconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_id () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ifconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_iftop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ignored () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_imagemagick () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_in_vared () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_inetadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_init_d () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_initctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_install () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_invoke-rc.d () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ionice () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_iostat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ipadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ipfw () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ipsec () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ipset () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_iptables () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_irssi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ispell () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_iwconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jail () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jails () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_java () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_java_class () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jexec () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jls () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jobs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jobs_bg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jobs_builtin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jobs_fg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_joe () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_join () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jot () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_jq () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kdeconnect () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kdump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kfmclient () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kill () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_killall () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kld () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_knock () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kpartx () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ktrace () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ktrace_points () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_kvno () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_last () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ld_debug () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ldap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ldconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ldd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_less () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lha () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_libvirt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lighttpd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_limactl () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_limit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_limits () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_links () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lintian () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_list () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_list_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lldb () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ln () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_loadkeys () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_locale () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_localedef () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_locales () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_locate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_logger () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_logical_volumes () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_login_classes () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_look () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_losetup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ls () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsattr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsblk () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lscfg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsdev () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lslv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsns () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsof () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lspv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsusb () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lsvg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ltrace () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lua () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_luarocks () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lynx () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lz4 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_lzop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mac_applications () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mac_files_for_application () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_madison () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mail () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mailboxes () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_main_complete () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_make () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_make-kpkg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_man () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mat2 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_match () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_math () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_math_params () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_matlab () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_maw () {
	# undefined
	builtin autoload -XUz /Users/nat/.zsh/completions
}
_md5sum () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mdadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mdfind () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mdls () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mdutil () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_members () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mencal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_menu () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mere () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mergechanges () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_message () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mii-tool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mime_types () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mixerctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mkdir () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mkfifo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mknod () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mkshortcut () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mktemp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mkzsh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_module () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_module-assistant () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_module_math_func () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_modutils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mondo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_monotone () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_moosic () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mosh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_most_recent_file () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mount () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mozilla () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mpc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mplayer () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mtools () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mtr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_multi_parts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mupdf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mutt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_my_accounts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_myrepos () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mysql_utils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_mysqldiff () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nautilus () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nbsd_architectures () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ncftp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nedit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_net_interfaces () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_netcat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_netscape () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_netstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_networkmanager () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_networksetup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_newsgroups () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_next_label () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_next_tags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nginx () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ngrep () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nice () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ninja () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_nkf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nmap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_normal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nothing () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_npm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nsenter () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nslookup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_numbers () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_numfmt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_nvram () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_objdump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_object_classes () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_object_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_obsd_architectures () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_od () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_okular () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_oldlist () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_open () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_openstack () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_opkg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_options () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_options_set () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_options_unset () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_opustools () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_osascript () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_osc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_other_accounts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_otool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_p11-kit () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_pack () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pandoc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_parameter () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_parameters () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pass () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_paste () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_patch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_patchutils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_path_commands () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_path_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pax () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pbcopy () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pbm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pbuilder () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pdf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pdftk () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_perf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_perforce () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_perl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_perl_basepods () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_perl_modules () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_perldoc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pfctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pfexec () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pgids () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pgrep () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_php () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_physical_volumes () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pick_variant () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_picocom () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pidof () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pids () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pine () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ping () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pipx () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_piuparts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkg-config () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkg5 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkg_instance () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkgadd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkgin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkginfo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkgrm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pkgtool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_plutil () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pmap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pon () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_portaudit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_portlint () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_portmaster () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ports () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_portsnap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_postfix () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_postgresql () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_postscript () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_powerd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_precommand () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_prefix () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_print () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_printenv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_printers () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_process_names () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_procstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_prompt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_prove () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_prstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ps () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ps1234 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pscp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pspdf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_psutils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ptree () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ptx () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_putclip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pwgen () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_pydoc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_python () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_python_modules () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_qdbus () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_qemu () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_qiv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_qtplay () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_quilt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rake () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ranlib () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rar () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rcctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rclone () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_rcs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rdesktop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_read () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_read_comp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_readelf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_readlink () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_readshortcut () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rebootin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_redirect () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_regex_arguments () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_regex_words () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_remote_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_renice () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_reprepro () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_requested () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_retrieve_cache () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_retrieve_mac_apps () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rg () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_ri () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rlogin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rmdir () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_route () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_routing_domains () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_routing_tables () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rpm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rrdtool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rsync () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_rubber () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ruby () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_run-help () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_runit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_samba () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_savecore () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_say () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sbuild () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sc_usage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sccs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sched () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_schedtool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_schroot () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_scl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_scons () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_screen () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_script () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_scselect () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_scutil () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_seafile () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sed () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_selinux_contexts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_selinux_roles () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_selinux_types () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_selinux_users () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sep_parts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_seq () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sequence () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_service () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_services () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_set () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_set_command () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_set_remove () {
	comm -23 <(echo $1 | sort | tr " " "\n") <(echo $2 | sort | tr " " "\n") 2> /dev/null
}
_setfacl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_setopt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_setpriv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_setsid () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_setup () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_setxkbmap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_shasum () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_showmount () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_shred () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_shuf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_shutdown () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_signals () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_signify () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sisu () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_slabtop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_slrn () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_smartmontools () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_smit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_snoop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_socket () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sockstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_softwareupdate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sort () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_source () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_spamassassin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_split () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sqlite () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sqsh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ss () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ssh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ssh_hosts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sshfs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_starship () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_stat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_stdbuf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_stgit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_store_cache () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_stow () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_strace () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_strftime () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_strings () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_strip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_stty () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_su () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sub_commands () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sublimetext () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_subscript () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_subversion () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sudo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_suffix_alias_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_surfraw () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_svcadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_svccfg () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_svcprop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_svcs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_svcs_fmri () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_svn-buildpackage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sw_vers () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_swaks () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_swanctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_swift () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sys_calls () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sysclean () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sysctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sysmerge () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_syspatch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sysrc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sysstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_systat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_system_profiler () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_sysupgrade () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tac () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tags () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tail () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tar () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tar_archive () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tardy () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tcpdump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tcpsys () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tcptraceroute () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tee () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_telnet () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_terminals () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tex () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_texi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_texinfo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tidy () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tiff () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tilde () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tilde_files () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_time_zone () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_timeout () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tla () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tload () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tmux () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_todo.sh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_toilet () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_toolchain-source () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_top () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_topgit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_totd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_touch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tpb () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tput () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tracepath () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_transmission () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_trap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_trash () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tree () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_truncate () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_truss () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_trust () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_tty () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ttyctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ttys () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_tune2fs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_twidge () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_twisted () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_typeset () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_typst () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_ulimit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_uml () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_umountable () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_unace () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_uname () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_unexpand () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_unhash () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_uniq () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_unison () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_units () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_unshare () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_update-alternatives () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_update-rc.d () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_uptime () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_urls () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_urpmi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_urxvt () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_usbconfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_uscan () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_user_admin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_user_at_host () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_user_expand () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_user_math_func () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_users () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_users_on () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_uv () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_uvx () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_valgrind () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_value () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_values () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vared () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vars () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vcs_info () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vcs_info_hooks () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vim () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vim-addons () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_visudo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vmctl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vmstat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vnc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_volume_groups () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vorbis () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vpnc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_vserver () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_w () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_w3m () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wait () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wajig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wakeup_capable_devices () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wanna-build () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wanted () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wasmtime () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_watch () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_watch-snoop () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_webbrowser () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wget () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_whereis () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_which () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_who () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_whois () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_widgets () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wiggle () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wipefs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_wpa_cli () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_arguments () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_borderwidth () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_color () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_colormapid () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_cursor () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_display () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_extension () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_font () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_geometry () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_keysym () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_locale () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_modifier () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_name () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_resource () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_selection_timeout () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_title () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_utils () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_visual () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_x_window () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xargs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xauth () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xautolock () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xclip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xcode-select () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xdvi () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xfig () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xft_fonts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xinput () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xloadimage () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xmlsoft () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xmlstarlet () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xmms2 () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xmodmap () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xournal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xpdf () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xrandr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xscreensaver () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xset () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xt_arguments () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xt_session_id () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xterm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xwit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xxd () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_xz () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_yafc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_yast () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_yodl () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_yp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_yq () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_yt-dlp () {
	# undefined
	builtin autoload -XUz /opt/homebrew/share/zsh/site-functions
}
_yum () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zargs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zattr () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zcalc () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zcalc_line () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zcat () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zcompile () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zdump () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zeal () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zed () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zfs () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zfs_dataset () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zfs_pool () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zftp () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zip () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zle () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zlogin () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zmodload () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zmv () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zoneadm () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zones () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zparseopts () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zpty () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zsh () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zsh-mime-handler () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zsh_autosuggest_strategy_atuin () {
	suggestion=$(ATUIN_QUERY="$1" atuin search --cmd-only --limit 1 --search-mode prefix 2>/dev/null) 
}
_zsocket () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zstyle () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_ztodo () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
_zypper () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
add-zsh-hook () {
	emulate -L zsh
	local -a hooktypes
	hooktypes=(chpwd precmd preexec periodic zshaddhistory zshexit zsh_directory_name) 
	local usage="Usage: add-zsh-hook hook function\nValid hooks are:\n  $hooktypes" 
	local opt
	local -a autoopts
	integer del list help
	while getopts "dDhLUzk" opt
	do
		case $opt in
			(d) del=1  ;;
			(D) del=2  ;;
			(h) help=1  ;;
			(L) list=1  ;;
			([Uzk]) autoopts+=(-$opt)  ;;
			(*) return 1 ;;
		esac
	done
	shift $(( OPTIND - 1 ))
	if (( list ))
	then
		typeset -mp "(${1:-${(@j:|:)hooktypes}})_functions"
		return $?
	elif (( help || $# != 2 || ${hooktypes[(I)$1]} == 0 ))
	then
		print -u$(( 2 - help )) $usage
		return $(( 1 - help ))
	fi
	local hook="${1}_functions" 
	local fn="$2" 
	if (( del ))
	then
		if (( ${(P)+hook} ))
		then
			if (( del == 2 ))
			then
				set -A $hook ${(P)hook:#${~fn}}
			else
				set -A $hook ${(P)hook:#$fn}
			fi
			if (( ! ${(P)#hook} ))
			then
				unset $hook
			fi
		fi
	else
		if (( ${(P)+hook} ))
		then
			if (( ${${(P)hook}[(I)$fn]} == 0 ))
			then
				typeset -ga $hook
				set -A $hook ${(P)hook} $fn
			fi
		else
			typeset -ga $hook
			set -A $hook $fn
		fi
		autoload $autoopts -- $fn
	fi
}
bashcompinit () {
	# undefined
	builtin autoload -XUz
}
claude () {
	if [[ "$*" == *"--continue"* ]]
	then
		command claude "$@" || command claude "${@/--continue/}"
	else
		command claude "$@"
	fi
}
claude46 () {
	ANTHROPIC_MODEL="claude-opus-4-6[1m]" claude "$@"
}
claude47 () {
	ANTHROPIC_MODEL="claude-opus-4-7" claude "$@"
}
claude48 () {
	ANTHROPIC_MODEL="claude-opus-4-8" claude "$@"
}
compaudit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
compdef () {
	local opt autol type func delete eval new i ret=0 cmd svc 
	local -a match mbegin mend
	emulate -L zsh
	setopt extendedglob
	if (( ! $# ))
	then
		print -u2 "$0: I need arguments"
		return 1
	fi
	while getopts "anpPkKde" opt
	do
		case "$opt" in
			(a) autol=yes  ;;
			(n) new=yes  ;;
			([pPkK]) if [[ -n "$type" ]]
				then
					print -u2 "$0: type already set to $type"
					return 1
				fi
				if [[ "$opt" = p ]]
				then
					type=pattern 
				elif [[ "$opt" = P ]]
				then
					type=postpattern 
				elif [[ "$opt" = K ]]
				then
					type=widgetkey 
				else
					type=key 
				fi ;;
			(d) delete=yes  ;;
			(e) eval=yes  ;;
		esac
	done
	shift OPTIND-1
	if (( ! $# ))
	then
		print -u2 "$0: I need arguments"
		return 1
	fi
	if [[ -z "$delete" ]]
	then
		if [[ -z "$eval" ]] && [[ "$1" = *\=* ]]
		then
			while (( $# ))
			do
				if [[ "$1" = *\=* ]]
				then
					cmd="${1%%\=*}" 
					svc="${1#*\=}" 
					func="$_comps[${_services[(r)$svc]:-$svc}]" 
					[[ -n ${_services[$svc]} ]] && svc=${_services[$svc]} 
					[[ -z "$func" ]] && func="${${_patcomps[(K)$svc][1]}:-${_postpatcomps[(K)$svc][1]}}" 
					if [[ -n "$func" ]]
					then
						_comps[$cmd]="$func" 
						_services[$cmd]="$svc" 
					else
						print -u2 "$0: unknown command or service: $svc"
						ret=1 
					fi
				else
					print -u2 "$0: invalid argument: $1"
					ret=1 
				fi
				shift
			done
			return ret
		fi
		func="$1" 
		[[ -n "$autol" ]] && autoload -rUz "$func"
		shift
		case "$type" in
			(widgetkey) while [[ -n $1 ]]
				do
					if [[ $# -lt 3 ]]
					then
						print -u2 "$0: compdef -K requires <widget> <comp-widget> <key>"
						return 1
					fi
					[[ $1 = _* ]] || 1="_$1" 
					[[ $2 = .* ]] || 2=".$2" 
					[[ $2 = .menu-select ]] && zmodload -i zsh/complist
					zle -C "$1" "$2" "$func"
					if [[ -n $new ]]
					then
						bindkey "$3" | IFS=$' \t' read -A opt
						[[ $opt[-1] = undefined-key ]] && bindkey "$3" "$1"
					else
						bindkey "$3" "$1"
					fi
					shift 3
				done ;;
			(key) if [[ $# -lt 2 ]]
				then
					print -u2 "$0: missing keys"
					return 1
				fi
				if [[ $1 = .* ]]
				then
					[[ $1 = .menu-select ]] && zmodload -i zsh/complist
					zle -C "$func" "$1" "$func"
				else
					[[ $1 = menu-select ]] && zmodload -i zsh/complist
					zle -C "$func" ".$1" "$func"
				fi
				shift
				for i
				do
					if [[ -n $new ]]
					then
						bindkey "$i" | IFS=$' \t' read -A opt
						[[ $opt[-1] = undefined-key ]] || continue
					fi
					bindkey "$i" "$func"
				done ;;
			(*) while (( $# ))
				do
					if [[ "$1" = -N ]]
					then
						type=normal 
					elif [[ "$1" = -p ]]
					then
						type=pattern 
					elif [[ "$1" = -P ]]
					then
						type=postpattern 
					else
						case "$type" in
							(pattern) if [[ $1 = (#b)(*)=(*) ]]
								then
									_patcomps[$match[1]]="=$match[2]=$func" 
								else
									_patcomps[$1]="$func" 
								fi ;;
							(postpattern) if [[ $1 = (#b)(*)=(*) ]]
								then
									_postpatcomps[$match[1]]="=$match[2]=$func" 
								else
									_postpatcomps[$1]="$func" 
								fi ;;
							(*) if [[ "$1" = *\=* ]]
								then
									cmd="${1%%\=*}" 
									svc=yes 
								else
									cmd="$1" 
									svc= 
								fi
								if [[ -z "$new" || -z "${_comps[$1]}" ]]
								then
									_comps[$cmd]="$func" 
									[[ -n "$svc" ]] && _services[$cmd]="${1#*\=}" 
								fi ;;
						esac
					fi
					shift
				done ;;
		esac
	else
		case "$type" in
			(pattern) unset "_patcomps[$^@]" ;;
			(postpattern) unset "_postpatcomps[$^@]" ;;
			(key) print -u2 "$0: cannot restore key bindings"
				return 1 ;;
			(*) unset "_comps[$^@]" ;;
		esac
	fi
}
compdump () {
	# undefined
	builtin autoload -XUz
}
compgen () {
	local opts prefix suffix job OPTARG OPTIND ret=1 
	local -a name res results jids
	local -A shortopts
	emulate -L sh
	setopt kshglob noshglob braceexpand nokshautoload
	shortopts=(a alias b builtin c command d directory e export f file g group j job k keyword u user v variable) 
	while getopts "o:A:G:C:F:P:S:W:X:abcdefgjkuv" name
	do
		case $name in
			([abcdefgjkuv]) OPTARG="${shortopts[$name]}"  ;&
			(A) case $OPTARG in
					(alias) results+=("${(k)aliases[@]}")  ;;
					(arrayvar) results+=("${(k@)parameters[(R)array*]}")  ;;
					(binding) results+=("${(k)widgets[@]}")  ;;
					(builtin) results+=("${(k)builtins[@]}" "${(k)dis_builtins[@]}")  ;;
					(command) results+=("${(k)commands[@]}" "${(k)aliases[@]}" "${(k)builtins[@]}" "${(k)functions[@]}" "${(k)reswords[@]}")  ;;
					(directory) setopt bareglobqual
						results+=(${IPREFIX}${PREFIX}*${SUFFIX}${ISUFFIX}(N-/)) 
						setopt nobareglobqual ;;
					(disabled) results+=("${(k)dis_builtins[@]}")  ;;
					(enabled) results+=("${(k)builtins[@]}")  ;;
					(export) results+=("${(k)parameters[(R)*export*]}")  ;;
					(file) setopt bareglobqual
						results+=(${IPREFIX}${PREFIX}*${SUFFIX}${ISUFFIX}(N)) 
						setopt nobareglobqual ;;
					(function) results+=("${(k)functions[@]}")  ;;
					(group) emulate zsh
						_groups -U -O res
						emulate sh
						setopt kshglob noshglob braceexpand
						results+=("${res[@]}")  ;;
					(hostname) emulate zsh
						_hosts -U -O res
						emulate sh
						setopt kshglob noshglob braceexpand
						results+=("${res[@]}")  ;;
					(job) results+=("${savejobtexts[@]%% *}")  ;;
					(keyword) results+=("${(k)reswords[@]}")  ;;
					(running) jids=("${(@k)savejobstates[(R)running*]}") 
						for job in "${jids[@]}"
						do
							results+=(${savejobtexts[$job]%% *}) 
						done ;;
					(stopped) jids=("${(@k)savejobstates[(R)suspended*]}") 
						for job in "${jids[@]}"
						do
							results+=(${savejobtexts[$job]%% *}) 
						done ;;
					(setopt | shopt) results+=("${(k)options[@]}")  ;;
					(signal) results+=("SIG${^signals[@]}")  ;;
					(user) results+=("${(k)userdirs[@]}")  ;;
					(variable) results+=("${(k)parameters[@]}")  ;;
					(helptopic)  ;;
				esac ;;
			(F) COMPREPLY=() 
				local -a args
				args=("${words[0]}" "${@[-1]}" "${words[CURRENT-2]}") 
				() {
					typeset -h words
					$OPTARG "${args[@]}"
				}
				results+=("${COMPREPLY[@]}")  ;;
			(G) setopt nullglob
				results+=(${~OPTARG}) 
				unsetopt nullglob ;;
			(W) results+=(${(Q)~=OPTARG})  ;;
			(C) results+=($(eval $OPTARG))  ;;
			(P) prefix="$OPTARG"  ;;
			(S) suffix="$OPTARG"  ;;
			(X) if [[ ${OPTARG[0]} = '!' ]]
				then
					results=("${(M)results[@]:#${OPTARG#?}}") 
				else
					results=("${results[@]:#$OPTARG}") 
				fi ;;
		esac
	done
	print -l -r -- "$prefix${^results[@]}$suffix"
}
compinit () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
compinstall () {
	# undefined
	builtin autoload -XUz /usr/share/zsh/5.9/functions
}
complete () {
	emulate -L zsh
	local args void cmd print remove
	args=("$@") 
	zparseopts -D -a void o: A: G: W: C: F: P: S: X: a b c d e f g j k u v p=print r=remove
	if [[ -n $print ]]
	then
		printf 'complete %2$s %1$s\n' "${(@kv)_comps[(R)_bash*]#* }"
	elif [[ -n $remove ]]
	then
		for cmd
		do
			unset "_comps[$cmd]"
		done
	else
		compdef _bash_complete\ ${(j. .)${(q)args[1,-1-$#]}} "$@"
	fi
}
getent () {
	if [[ $1 = hosts ]]
	then
		sed 's/#.*//' /etc/$1 | grep -w $2
	elif [[ $2 = <-> ]]
	then
		grep ":$2:[^:]*$" /etc/$1
	else
		grep "^$2:" /etc/$1
	fi
}
ghq () {
	if [[ "$1" == "get" || "$1" == "clone" ]]
	then
		local subcmd="$1" 
		shift
		local args=() 
		local arg
		for arg in "$@"
		do
			if [[ "$arg" != -* ]] && {
					[[ "$arg" == *github.com* ]] || [[ "$arg" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]
				}
			then
				args+=("$(echo "$arg" | tr '[:upper:]' '[:lower:]')") 
			else
				args+=("$arg") 
			fi
		done
		command ghq "$subcmd" "${args[@]}"
	else
		command ghq "$@"
	fi
}
gq () {
	local url="$1" 
	url=$(echo "$url" | sed "s|/tree/[^/]*$||" | sed "s|/blob/.*$||") 
	local repo_path=$(echo "$url" | sed "s|https://github.com/||" | sed "s|git@github.com:||" | sed "s|\.git$||") 
	local full_path="$(ghq root)/github.com/$repo_path" 
	if ghq get -u -p "$url" 2> /dev/null
	then
		cd "$full_path"
	elif [[ -d "$full_path" ]]
	then
		cd "$full_path"
		echo "repo exists, trying rebase..."
		git fetch origin && git rebase origin/$(git symbolic-ref --short HEAD) 2> /dev/null && echo "rebased" || echo "diverged"
	else
		echo "failed to clone $url"
		return 1
	fi
}
haiku () {
	ANTHROPIC_MODEL="claude-haiku-4-5-20251001" claude "$@"
}
maw () {
	if [[ "$1" == "warp" ]]
	then
		shift
		local target="${1:-mawjs}" 
		if [[ "$target" == *:* ]]
		then
			echo "maw warp: qualified <oracle>:<node> not supported yet (see #804)" >&2
			return 1
		fi
		local path
		if ! path="$(command maw locate "$target" --path 2>/dev/null)"  || [[ -z "$path" ]]
		then
			echo "maw warp: oracle '$target' not found" >&2
			return 1
		fi
		builtin cd "$path"
	else
		command maw "$@"
	fi
}
nvm () {
	if [ "$#" -lt 1 ]
	then
		nvm --help
		return
	fi
	local DEFAULT_IFS
	DEFAULT_IFS=" $(nvm_echo t | command tr t \\t)
" 
	if [ "${-#*e}" != "$-" ]
	then
		set +e
		local EXIT_CODE
		IFS="${DEFAULT_IFS}" nvm "$@"
		EXIT_CODE="$?" 
		set -e
		return "$EXIT_CODE"
	elif [ "${-#*a}" != "$-" ]
	then
		set +a
		local EXIT_CODE
		IFS="${DEFAULT_IFS}" nvm "$@"
		EXIT_CODE="$?" 
		set -a
		return "$EXIT_CODE"
	elif [ -n "${BASH-}" ] && [ "${-#*E}" != "$-" ]
	then
		set +E
		local EXIT_CODE
		IFS="${DEFAULT_IFS}" nvm "$@"
		EXIT_CODE="$?" 
		set -E
		return "$EXIT_CODE"
	elif [ "${IFS}" != "${DEFAULT_IFS}" ]
	then
		IFS="${DEFAULT_IFS}" nvm "$@"
		return "$?"
	fi
	local i
	for i in "$@"
	do
		case $i in
			(--) break ;;
			('-h' | 'help' | '--help') NVM_NO_COLORS="" 
				for j in "$@"
				do
					if [ "${j}" = '--no-colors' ]
					then
						NVM_NO_COLORS="${j}" 
						break
					fi
				done
				local NVM_IOJS_PREFIX
				NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
				local NVM_NODE_PREFIX
				NVM_NODE_PREFIX="$(nvm_node_prefix)" 
				NVM_VERSION="$(nvm --version)" 
				nvm_echo
				nvm_echo "Node Version Manager (v${NVM_VERSION})"
				nvm_echo
				nvm_echo 'Note: <version> refers to any version-like string nvm understands. This includes:'
				nvm_echo '  - full or partial version numbers, starting with an optional "v" (0.10, v0.1.2, v1)'
				nvm_echo "  - default (built-in) aliases: ${NVM_NODE_PREFIX}, stable, unstable, ${NVM_IOJS_PREFIX}, system"
				nvm_echo '  - custom aliases you define with `nvm alias foo`'
				nvm_echo
				nvm_echo ' Any options that produce colorized output should respect the `--no-colors` option.'
				nvm_echo
				nvm_echo 'Usage:'
				nvm_echo '  nvm --help                                  Show this message'
				nvm_echo '    --no-colors                               Suppress colored output'
				nvm_echo '  nvm --version                               Print out the installed version of nvm'
				nvm_echo '  nvm install [<version>]                     Download and install a <version>. Uses .nvmrc if available and version is omitted.'
				nvm_echo '   The following optional arguments, if provided, must appear directly after `nvm install`:'
				nvm_echo '    -s                                        Skip binary download, install from source only.'
				nvm_echo '    -b                                        Skip source download, install from binary only.'
				nvm_echo '    --reinstall-packages-from=<version>       When installing, reinstall packages installed in <node|iojs|node version number>'
				nvm_echo '    --lts                                     When installing, only select from LTS (long-term support) versions'
				nvm_echo '    --lts=<LTS name>                          When installing, only select from versions for a specific LTS line'
				nvm_echo '    --skip-default-packages                   When installing, skip the default-packages file if it exists'
				nvm_echo '    --latest-npm                              After installing, attempt to upgrade to the latest working npm on the given node version'
				nvm_echo '    --no-progress                             Disable the progress bar on any downloads'
				nvm_echo '    --alias=<name>                            After installing, set the alias specified to the version specified. (same as: nvm alias <name> <version>)'
				nvm_echo '    --default                                 After installing, set default alias to the version specified. (same as: nvm alias default <version>)'
				nvm_echo '    --save                                    After installing, write the specified version to .nvmrc'
				nvm_echo '  nvm uninstall <version>                     Uninstall a version'
				nvm_echo '  nvm uninstall --lts                         Uninstall using automatic LTS (long-term support) alias `lts/*`, if available.'
				nvm_echo '  nvm uninstall --lts=<LTS name>              Uninstall using automatic alias for provided LTS line, if available.'
				nvm_echo '  nvm use [<version>]                         Modify PATH to use <version>. Uses .nvmrc if available and version is omitted.'
				nvm_echo '   The following optional arguments, if provided, must appear directly after `nvm use`:'
				nvm_echo '    --silent                                  Silences stdout/stderr output'
				nvm_echo '    --lts                                     Uses automatic LTS (long-term support) alias `lts/*`, if available.'
				nvm_echo '    --lts=<LTS name>                          Uses automatic alias for provided LTS line, if available.'
				nvm_echo '    --save                                    Writes the specified version to .nvmrc.'
				nvm_echo '  nvm exec [<version>] [<command>]            Run <command> on <version>. Uses .nvmrc if available and version is omitted.'
				nvm_echo '   The following optional arguments, if provided, must appear directly after `nvm exec`:'
				nvm_echo '    --silent                                  Silences stdout/stderr output'
				nvm_echo '    --lts                                     Uses automatic LTS (long-term support) alias `lts/*`, if available.'
				nvm_echo '    --lts=<LTS name>                          Uses automatic alias for provided LTS line, if available.'
				nvm_echo '  nvm run [<version>] [<args>]                Run `node` on <version> with <args> as arguments. Uses .nvmrc if available and version is omitted.'
				nvm_echo '   The following optional arguments, if provided, must appear directly after `nvm run`:'
				nvm_echo '    --silent                                  Silences stdout/stderr output'
				nvm_echo '    --lts                                     Uses automatic LTS (long-term support) alias `lts/*`, if available.'
				nvm_echo '    --lts=<LTS name>                          Uses automatic alias for provided LTS line, if available.'
				nvm_echo '  nvm current                                 Display currently activated version of Node'
				nvm_echo '  nvm ls [<version>]                          List installed versions, matching a given <version> if provided'
				nvm_echo '    --no-colors                               Suppress colored output'
				nvm_echo '    --no-alias                                Suppress `nvm alias` output'
				nvm_echo '  nvm ls-remote [<version>]                   List remote versions available for install, matching a given <version> if provided'
				nvm_echo '    --lts                                     When listing, only show LTS (long-term support) versions'
				nvm_echo '    --lts=<LTS name>                          When listing, only show versions for a specific LTS line'
				nvm_echo '    --no-colors                               Suppress colored output'
				nvm_echo '  nvm version <version>                       Resolve the given description to a single local version'
				nvm_echo '  nvm version-remote <version>                Resolve the given description to a single remote version'
				nvm_echo '    --lts                                     When listing, only select from LTS (long-term support) versions'
				nvm_echo '    --lts=<LTS name>                          When listing, only select from versions for a specific LTS line'
				nvm_echo '  nvm deactivate                              Undo effects of `nvm` on current shell'
				nvm_echo '    --silent                                  Silences stdout/stderr output'
				nvm_echo '  nvm alias [<pattern>]                       Show all aliases beginning with <pattern>'
				nvm_echo '    --no-colors                               Suppress colored output'
				nvm_echo '  nvm alias <name> <version>                  Set an alias named <name> pointing to <version>'
				nvm_echo '  nvm unalias <name>                          Deletes the alias named <name>'
				nvm_echo '  nvm install-latest-npm                      Attempt to upgrade to the latest working `npm` on the current node version'
				nvm_echo '  nvm reinstall-packages <version>            Reinstall global `npm` packages contained in <version> to current version'
				nvm_echo '  nvm unload                                  Unload `nvm` from shell'
				nvm_echo '  nvm which [current | <version>]             Display path to installed node version. Uses .nvmrc if available and version is omitted.'
				nvm_echo '    --silent                                  Silences stdout/stderr output when a version is omitted'
				nvm_echo '  nvm cache dir                               Display path to the cache directory for nvm'
				nvm_echo '  nvm cache clear                             Empty cache directory for nvm'
				nvm_echo '  nvm set-colors [<color codes>]              Set five text colors using format "yMeBg". Available when supported.'
				nvm_echo '                                               Initial colors are:'
				nvm_echo_with_colors "                                                  $(nvm_wrap_with_color_code 'b' 'b')$(nvm_wrap_with_color_code 'y' 'y')$(nvm_wrap_with_color_code 'g' 'g')$(nvm_wrap_with_color_code 'r' 'r')$(nvm_wrap_with_color_code 'e' 'e')"
				nvm_echo '                                               Color codes:'
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'r' 'r')/$(nvm_wrap_with_color_code 'R' 'R') = $(nvm_wrap_with_color_code 'r' 'red') / $(nvm_wrap_with_color_code 'R' 'bold red')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'g' 'g')/$(nvm_wrap_with_color_code 'G' 'G') = $(nvm_wrap_with_color_code 'g' 'green') / $(nvm_wrap_with_color_code 'G' 'bold green')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'b' 'b')/$(nvm_wrap_with_color_code 'B' 'B') = $(nvm_wrap_with_color_code 'b' 'blue') / $(nvm_wrap_with_color_code 'B' 'bold blue')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'c' 'c')/$(nvm_wrap_with_color_code 'C' 'C') = $(nvm_wrap_with_color_code 'c' 'cyan') / $(nvm_wrap_with_color_code 'C' 'bold cyan')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'm' 'm')/$(nvm_wrap_with_color_code 'M' 'M') = $(nvm_wrap_with_color_code 'm' 'magenta') / $(nvm_wrap_with_color_code 'M' 'bold magenta')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'y' 'y')/$(nvm_wrap_with_color_code 'Y' 'Y') = $(nvm_wrap_with_color_code 'y' 'yellow') / $(nvm_wrap_with_color_code 'Y' 'bold yellow')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'k' 'k')/$(nvm_wrap_with_color_code 'K' 'K') = $(nvm_wrap_with_color_code 'k' 'black') / $(nvm_wrap_with_color_code 'K' 'bold black')"
				nvm_echo_with_colors "                                                $(nvm_wrap_with_color_code 'e' 'e')/$(nvm_wrap_with_color_code 'W' 'W') = $(nvm_wrap_with_color_code 'e' 'light grey') / $(nvm_wrap_with_color_code 'W' 'white')"
				nvm_echo 'Example:'
				nvm_echo '  nvm install 8.0.0                     Install a specific version number'
				nvm_echo '  nvm use 8.0                           Use the latest available 8.0.x release'
				nvm_echo '  nvm run 6.10.3 app.js                 Run app.js using node 6.10.3'
				nvm_echo '  nvm exec 4.8.3 node app.js            Run `node app.js` with the PATH pointing to node 4.8.3'
				nvm_echo '  nvm alias default 8.1.0               Set default node version on a shell'
				nvm_echo '  nvm alias default node                Always default to the latest available node version on a shell'
				nvm_echo
				nvm_echo '  nvm install node                      Install the latest available version'
				nvm_echo '  nvm use node                          Use the latest version'
				nvm_echo '  nvm install --lts                     Install the latest LTS version'
				nvm_echo '  nvm use --lts                         Use the latest LTS version'
				nvm_echo
				nvm_echo '  nvm set-colors cgYmW                  Set text colors to cyan, green, bold yellow, magenta, and white'
				nvm_echo
				nvm_echo 'Note:'
				nvm_echo '  to remove, delete, or uninstall nvm - just remove the `$NVM_DIR` folder (usually `~/.nvm`)'
				nvm_echo
				return 0 ;;
		esac
	done
	local COMMAND
	COMMAND="${1-}" 
	shift
	local VERSION
	local ADDITIONAL_PARAMETERS
	case $COMMAND in
		("cache") case "${1-}" in
				(dir) nvm_cache_dir ;;
				(clear) local DIR
					DIR="$(nvm_cache_dir)" 
					if command rm -rf "${DIR}" && command mkdir -p "${DIR}"
					then
						nvm_echo 'nvm cache cleared.'
					else
						nvm_err "Unable to clear nvm cache: ${DIR}"
						return 1
					fi ;;
				(*) nvm --help >&2
					return 127 ;;
			esac ;;
		("debug") local OS_VERSION
			nvm_is_zsh && setopt local_options shwordsplit
			nvm_err "nvm --version: v$(nvm --version)"
			if [ -n "${TERM_PROGRAM-}" ]
			then
				nvm_err "\$TERM_PROGRAM: ${TERM_PROGRAM}"
			fi
			nvm_err "\$SHELL: ${SHELL}"
			nvm_err "\$SHLVL: ${SHLVL-}"
			nvm_err "whoami: '$(whoami)'"
			nvm_err "\${HOME}: ${HOME}"
			nvm_err "\${NVM_DIR}: '$(nvm_sanitize_path "${NVM_DIR}")'"
			nvm_err "\${PATH}: $(nvm_sanitize_path "${PATH}")"
			nvm_err "\$PREFIX: '$(nvm_sanitize_path "${PREFIX}")'"
			nvm_err "\${NPM_CONFIG_PREFIX}: '$(nvm_sanitize_path "${NPM_CONFIG_PREFIX}")'"
			nvm_err "\$NVM_NODEJS_ORG_MIRROR: '${NVM_NODEJS_ORG_MIRROR}'"
			nvm_err "\$NVM_IOJS_ORG_MIRROR: '${NVM_IOJS_ORG_MIRROR}'"
			nvm_err "shell version: '$(${SHELL} --version | command head -n 1)'"
			nvm_err "uname -a: '$(command uname -a | command awk '{$2=""; print}' | command xargs)'"
			nvm_err "checksum binary: '$(nvm_get_checksum_binary 2>/dev/null)'"
			if [ "$(nvm_get_os)" = "darwin" ] && nvm_has sw_vers
			then
				OS_VERSION="$(sw_vers | command awk '{print $2}' | command xargs)" 
			elif [ -r "/etc/issue" ]
			then
				OS_VERSION="$(command head -n 1 /etc/issue | command sed 's/\\.//g')" 
				if [ -z "${OS_VERSION}" ] && [ -r "/etc/os-release" ]
				then
					OS_VERSION="$(. /etc/os-release && echo "${NAME}" "${VERSION}")" 
				fi
			fi
			if [ -n "${OS_VERSION}" ]
			then
				nvm_err "OS version: ${OS_VERSION}"
			fi
			if nvm_has "awk"
			then
				nvm_err "awk: $(nvm_command_info awk), $({ command awk --version 2>/dev/null || command awk -W version; } \
          | command head -n 1)"
			else
				nvm_err "awk: not found"
			fi
			if nvm_has "curl"
			then
				nvm_err "curl: $(nvm_command_info curl), $(command curl -V | command head -n 1)"
			else
				nvm_err "curl: not found"
			fi
			if nvm_has "wget"
			then
				nvm_err "wget: $(nvm_command_info wget), $(command wget -V | command head -n 1)"
			else
				nvm_err "wget: not found"
			fi
			local TEST_TOOLS ADD_TEST_TOOLS
			TEST_TOOLS="git grep" 
			ADD_TEST_TOOLS="sed cut basename rm mkdir xargs" 
			if [ "darwin" != "$(nvm_get_os)" ] && [ "freebsd" != "$(nvm_get_os)" ]
			then
				TEST_TOOLS="${TEST_TOOLS} ${ADD_TEST_TOOLS}" 
			else
				for tool in ${ADD_TEST_TOOLS}
				do
					if nvm_has "${tool}"
					then
						nvm_err "${tool}: $(nvm_command_info "${tool}")"
					else
						nvm_err "${tool}: not found"
					fi
				done
			fi
			for tool in ${TEST_TOOLS}
			do
				local NVM_TOOL_VERSION
				if nvm_has "${tool}"
				then
					if command ls -l "$(nvm_command_info "${tool}" | command awk '{print $1}')" | command grep -q busybox
					then
						NVM_TOOL_VERSION="$(command "${tool}" --help 2>&1 | command head -n 1)" 
					else
						NVM_TOOL_VERSION="$(command "${tool}" --version 2>&1 | command head -n 1)" 
					fi
					nvm_err "${tool}: $(nvm_command_info "${tool}"), ${NVM_TOOL_VERSION}"
				else
					nvm_err "${tool}: not found"
				fi
				unset NVM_TOOL_VERSION
			done
			unset TEST_TOOLS ADD_TEST_TOOLS
			local NVM_DEBUG_OUTPUT
			for NVM_DEBUG_COMMAND in 'nvm current' 'which node' 'which iojs' 'which npm' 'npm config get prefix' 'npm root -g'
			do
				NVM_DEBUG_OUTPUT="$(${NVM_DEBUG_COMMAND} 2>&1)" 
				nvm_err "${NVM_DEBUG_COMMAND}: $(nvm_sanitize_path "${NVM_DEBUG_OUTPUT}")"
			done
			return 42 ;;
		("install" | "i") local version_not_provided
			version_not_provided=0 
			local NVM_OS
			NVM_OS="$(nvm_get_os)" 
			if ! nvm_has "curl" && ! nvm_has "wget"
			then
				nvm_err 'nvm needs curl or wget to proceed.'
				return 1
			fi
			if [ $# -lt 1 ]
			then
				version_not_provided=1 
			fi
			local nobinary
			local nosource
			local noprogress
			nobinary=0 
			noprogress=0 
			nosource=0 
			local LTS
			local ALIAS
			local NVM_UPGRADE_NPM
			NVM_UPGRADE_NPM=0 
			local NVM_WRITE_TO_NVMRC
			NVM_WRITE_TO_NVMRC=0 
			local PROVIDED_REINSTALL_PACKAGES_FROM
			local REINSTALL_PACKAGES_FROM
			local SKIP_DEFAULT_PACKAGES
			while [ $# -ne 0 ]
			do
				case "$1" in
					(---*) nvm_err 'arguments with `---` are not supported - this is likely a typo'
						return 55 ;;
					(-s) shift
						nobinary=1 
						if [ $nosource -eq 1 ]
						then
							nvm err '-s and -b cannot be set together since they would skip install from both binary and source'
							return 6
						fi ;;
					(-b) shift
						nosource=1 
						if [ $nobinary -eq 1 ]
						then
							nvm err '-s and -b cannot be set together since they would skip install from both binary and source'
							return 6
						fi ;;
					(-j) shift
						nvm_get_make_jobs "$1"
						shift ;;
					(--no-progress) noprogress=1 
						shift ;;
					(--lts) LTS='*' 
						shift ;;
					(--lts=*) LTS="${1##--lts=}" 
						shift ;;
					(--latest-npm) NVM_UPGRADE_NPM=1 
						shift ;;
					(--default) if [ -n "${ALIAS-}" ]
						then
							nvm_err '--default and --alias are mutually exclusive, and may not be provided more than once'
							return 6
						fi
						ALIAS='default' 
						shift ;;
					(--alias=*) if [ -n "${ALIAS-}" ]
						then
							nvm_err '--default and --alias are mutually exclusive, and may not be provided more than once'
							return 6
						fi
						ALIAS="${1##--alias=}" 
						shift ;;
					(--reinstall-packages-from=*) if [ -n "${PROVIDED_REINSTALL_PACKAGES_FROM-}" ]
						then
							nvm_err '--reinstall-packages-from may not be provided more than once'
							return 6
						fi
						PROVIDED_REINSTALL_PACKAGES_FROM="$(nvm_echo "$1" | command cut -c 27-)" 
						if [ -z "${PROVIDED_REINSTALL_PACKAGES_FROM}" ]
						then
							nvm_err 'If --reinstall-packages-from is provided, it must point to an installed version of node.'
							return 6
						fi
						REINSTALL_PACKAGES_FROM="$(nvm_version "${PROVIDED_REINSTALL_PACKAGES_FROM}")"  || :
						shift ;;
					(--copy-packages-from=*) if [ -n "${PROVIDED_REINSTALL_PACKAGES_FROM-}" ]
						then
							nvm_err '--reinstall-packages-from may not be provided more than once, or combined with `--copy-packages-from`'
							return 6
						fi
						PROVIDED_REINSTALL_PACKAGES_FROM="$(nvm_echo "$1" | command cut -c 22-)" 
						if [ -z "${PROVIDED_REINSTALL_PACKAGES_FROM}" ]
						then
							nvm_err 'If --copy-packages-from is provided, it must point to an installed version of node.'
							return 6
						fi
						REINSTALL_PACKAGES_FROM="$(nvm_version "${PROVIDED_REINSTALL_PACKAGES_FROM}")"  || :
						shift ;;
					(--reinstall-packages-from | --copy-packages-from) nvm_err "If ${1} is provided, it must point to an installed version of node using \`=\`."
						return 6 ;;
					(--skip-default-packages) SKIP_DEFAULT_PACKAGES=true 
						shift ;;
					(--save | -w) if [ $NVM_WRITE_TO_NVMRC -eq 1 ]
						then
							nvm_err '--save and -w may only be provided once'
							return 6
						fi
						NVM_WRITE_TO_NVMRC=1 
						shift ;;
					(*) break ;;
				esac
			done
			local provided_version
			provided_version="${1-}" 
			if [ -z "${provided_version}" ]
			then
				if [ "_${LTS-}" = '_*' ]
				then
					nvm_echo 'Installing latest LTS version.'
					if [ $# -gt 0 ]
					then
						shift
					fi
				elif [ "_${LTS-}" != '_' ]
				then
					nvm_echo "Installing with latest version of LTS line: ${LTS}"
					if [ $# -gt 0 ]
					then
						shift
					fi
				else
					nvm_rc_version
					if [ $version_not_provided -eq 1 ] && [ -z "${NVM_RC_VERSION}" ]
					then
						unset NVM_RC_VERSION
						nvm --help >&2
						return 127
					fi
					provided_version="${NVM_RC_VERSION}" 
					unset NVM_RC_VERSION
				fi
			elif [ $# -gt 0 ]
			then
				shift
			fi
			case "${provided_version}" in
				('lts/*') LTS='*' 
					provided_version=''  ;;
				(lts/*) LTS="${provided_version##lts/}" 
					provided_version=''  ;;
			esac
			local EXIT_CODE
			VERSION="$(NVM_VERSION_ONLY=true NVM_LTS="${LTS-}" nvm_remote_version "${provided_version}")" 
			EXIT_CODE="$?" 
			if [ "${VERSION}" = 'N/A' ] || [ $EXIT_CODE -ne 0 ]
			then
				local LTS_MSG
				local REMOTE_CMD
				if [ "${LTS-}" = '*' ]
				then
					LTS_MSG='(with LTS filter) ' 
					REMOTE_CMD='nvm ls-remote --lts' 
				elif [ -n "${LTS-}" ]
				then
					LTS_MSG="(with LTS filter '${LTS}') " 
					REMOTE_CMD="nvm ls-remote --lts=${LTS}" 
					if [ -z "${provided_version}" ]
					then
						nvm_err "Version with LTS filter '${LTS}' not found - try \`${REMOTE_CMD}\` to browse available versions."
						return 3
					fi
				else
					REMOTE_CMD='nvm ls-remote' 
				fi
				nvm_err "Version '${provided_version}' ${LTS_MSG-}not found - try \`${REMOTE_CMD}\` to browse available versions."
				return 3
			fi
			ADDITIONAL_PARAMETERS='' 
			while [ $# -ne 0 ]
			do
				case "$1" in
					(--reinstall-packages-from=*) if [ -n "${PROVIDED_REINSTALL_PACKAGES_FROM-}" ]
						then
							nvm_err '--reinstall-packages-from may not be provided more than once'
							return 6
						fi
						PROVIDED_REINSTALL_PACKAGES_FROM="$(nvm_echo "$1" | command cut -c 27-)" 
						if [ -z "${PROVIDED_REINSTALL_PACKAGES_FROM}" ]
						then
							nvm_err 'If --reinstall-packages-from is provided, it must point to an installed version of node.'
							return 6
						fi
						REINSTALL_PACKAGES_FROM="$(nvm_version "${PROVIDED_REINSTALL_PACKAGES_FROM}")"  || : ;;
					(--copy-packages-from=*) if [ -n "${PROVIDED_REINSTALL_PACKAGES_FROM-}" ]
						then
							nvm_err '--reinstall-packages-from may not be provided more than once, or combined with `--copy-packages-from`'
							return 6
						fi
						PROVIDED_REINSTALL_PACKAGES_FROM="$(nvm_echo "$1" | command cut -c 22-)" 
						if [ -z "${PROVIDED_REINSTALL_PACKAGES_FROM}" ]
						then
							nvm_err 'If --copy-packages-from is provided, it must point to an installed version of node.'
							return 6
						fi
						REINSTALL_PACKAGES_FROM="$(nvm_version "${PROVIDED_REINSTALL_PACKAGES_FROM}")"  || : ;;
					(--reinstall-packages-from | --copy-packages-from) nvm_err "If ${1} is provided, it must point to an installed version of node using \`=\`."
						return 6 ;;
					(--skip-default-packages) SKIP_DEFAULT_PACKAGES=true  ;;
					(*) ADDITIONAL_PARAMETERS="${ADDITIONAL_PARAMETERS} $1"  ;;
				esac
				shift
			done
			if [ -n "${PROVIDED_REINSTALL_PACKAGES_FROM-}" ] && [ "$(nvm_ensure_version_prefix "${PROVIDED_REINSTALL_PACKAGES_FROM}")" = "${VERSION}" ]
			then
				nvm_err "You can't reinstall global packages from the same version of node you're installing."
				return 4
			elif [ "${REINSTALL_PACKAGES_FROM-}" = 'N/A' ]
			then
				nvm_err "If --reinstall-packages-from is provided, it must point to an installed version of node."
				return 5
			fi
			local FLAVOR
			if nvm_is_iojs_version "${VERSION}"
			then
				FLAVOR="$(nvm_iojs_prefix)" 
			else
				FLAVOR="$(nvm_node_prefix)" 
			fi
			EXIT_CODE=0 
			if nvm_is_version_installed "${VERSION}"
			then
				nvm_err "${VERSION} is already installed."
				nvm use "${VERSION}"
				EXIT_CODE=$? 
				if [ $EXIT_CODE -eq 0 ]
				then
					if [ "${NVM_UPGRADE_NPM}" = 1 ]
					then
						nvm install-latest-npm
						EXIT_CODE=$? 
					fi
					if [ $EXIT_CODE -ne 0 ] && [ -z "${SKIP_DEFAULT_PACKAGES-}" ]
					then
						nvm_install_default_packages
					fi
					if [ $EXIT_CODE -ne 0 ] && [ -n "${REINSTALL_PACKAGES_FROM-}" ] && [ "_${REINSTALL_PACKAGES_FROM}" != "_N/A" ]
					then
						nvm reinstall-packages "${REINSTALL_PACKAGES_FROM}"
						EXIT_CODE=$? 
					fi
				fi
				if [ -n "${LTS-}" ]
				then
					LTS="$(echo "${LTS}" | tr '[:upper:]' '[:lower:]')" 
					nvm_ensure_default_set "lts/${LTS}"
				else
					nvm_ensure_default_set "${provided_version}"
				fi
				if [ $NVM_WRITE_TO_NVMRC -eq 1 ]
				then
					nvm_write_nvmrc "${VERSION}"
					EXIT_CODE=$? 
				fi
				if [ $EXIT_CODE -ne 0 ] && [ -n "${ALIAS-}" ]
				then
					nvm alias "${ALIAS}" "${provided_version}"
					EXIT_CODE=$? 
				fi
				return $EXIT_CODE
			fi
			if [ -n "${NVM_INSTALL_THIRD_PARTY_HOOK-}" ]
			then
				nvm_err '** $NVM_INSTALL_THIRD_PARTY_HOOK env var set; dispatching to third-party installation method **'
				local NVM_METHOD_PREFERENCE
				NVM_METHOD_PREFERENCE='binary' 
				if [ $nobinary -eq 1 ]
				then
					NVM_METHOD_PREFERENCE='source' 
				fi
				local VERSION_PATH
				VERSION_PATH="$(nvm_version_path "${VERSION}")" 
				"${NVM_INSTALL_THIRD_PARTY_HOOK}" "${VERSION}" "${FLAVOR}" std "${NVM_METHOD_PREFERENCE}" "${VERSION_PATH}" || {
					EXIT_CODE=$? 
					nvm_err '*** Third-party $NVM_INSTALL_THIRD_PARTY_HOOK env var failed to install! ***'
					return $EXIT_CODE
				}
				if ! nvm_is_version_installed "${VERSION}"
				then
					nvm_err '*** Third-party $NVM_INSTALL_THIRD_PARTY_HOOK env var claimed to succeed, but failed to install! ***'
					return 33
				fi
				EXIT_CODE=0 
			else
				if [ "_${NVM_OS}" = "_freebsd" ]
				then
					nobinary=1 
					nvm_err "Currently, there is no binary for FreeBSD"
				elif [ "_$NVM_OS" = "_openbsd" ]
				then
					nobinary=1 
					nvm_err "Currently, there is no binary for OpenBSD"
				elif [ "_${NVM_OS}" = "_sunos" ]
				then
					if ! nvm_has_solaris_binary "${VERSION}"
					then
						nobinary=1 
						nvm_err "Currently, there is no binary of version ${VERSION} for SunOS"
					fi
				fi
				if [ $nobinary -ne 1 ] && nvm_binary_available "${VERSION}"
				then
					NVM_NO_PROGRESS="${NVM_NO_PROGRESS:-${noprogress}}" nvm_install_binary "${FLAVOR}" std "${VERSION}" "${nosource}"
					EXIT_CODE=$? 
				else
					EXIT_CODE=-1 
					if [ $nosource -eq 1 ]
					then
						nvm_err "Binary download is not available for ${VERSION}"
						EXIT_CODE=3 
					fi
				fi
				if [ $EXIT_CODE -ne 0 ] && [ $nosource -ne 1 ]
				then
					if [ -z "${NVM_MAKE_JOBS-}" ]
					then
						nvm_get_make_jobs
					fi
					if [ "_${NVM_OS}" = "_win" ]
					then
						nvm_err 'Installing from source on non-WSL Windows is not supported'
						EXIT_CODE=87 
					else
						NVM_NO_PROGRESS="${NVM_NO_PROGRESS:-${noprogress}}" nvm_install_source "${FLAVOR}" std "${VERSION}" "${NVM_MAKE_JOBS}" "${ADDITIONAL_PARAMETERS}"
						EXIT_CODE=$? 
					fi
				fi
			fi
			if [ $EXIT_CODE -eq 0 ]
			then
				if nvm_use_if_needed "${VERSION}" && nvm_install_npm_if_needed "${VERSION}"
				then
					if [ -n "${LTS-}" ]
					then
						nvm_ensure_default_set "lts/${LTS}"
					else
						nvm_ensure_default_set "${provided_version}"
					fi
					if [ "${NVM_UPGRADE_NPM}" = 1 ]
					then
						nvm install-latest-npm
						EXIT_CODE=$? 
					fi
					if [ $EXIT_CODE -eq 0 ] && [ -z "${SKIP_DEFAULT_PACKAGES-}" ]
					then
						nvm_install_default_packages
					fi
					if [ $EXIT_CODE -eq 0 ] && [ -n "${REINSTALL_PACKAGES_FROM-}" ] && [ "_${REINSTALL_PACKAGES_FROM}" != "_N/A" ]
					then
						nvm reinstall-packages "${REINSTALL_PACKAGES_FROM}"
						EXIT_CODE=$? 
					fi
				else
					EXIT_CODE=$? 
				fi
			fi
			return $EXIT_CODE ;;
		("uninstall") if [ $# -ne 1 ]
			then
				nvm --help >&2
				return 127
			fi
			local PATTERN
			PATTERN="${1-}" 
			case "${PATTERN-}" in
				(--)  ;;
				(--lts | 'lts/*') VERSION="$(nvm_match_version "lts/*")"  ;;
				(lts/*) VERSION="$(nvm_match_version "lts/${PATTERN##lts/}")"  ;;
				(--lts=*) VERSION="$(nvm_match_version "lts/${PATTERN##--lts=}")"  ;;
				(*) VERSION="$(nvm_version "${PATTERN}")"  ;;
			esac
			if [ "_${VERSION}" = "_$(nvm_ls_current)" ]
			then
				if nvm_is_iojs_version "${VERSION}"
				then
					nvm_err "nvm: Cannot uninstall currently-active io.js version, ${VERSION} (inferred from ${PATTERN})."
				else
					nvm_err "nvm: Cannot uninstall currently-active node version, ${VERSION} (inferred from ${PATTERN})."
				fi
				return 1
			fi
			if ! nvm_is_version_installed "${VERSION}"
			then
				nvm_err "${VERSION} version is not installed..."
				return
			fi
			local SLUG_BINARY
			local SLUG_SOURCE
			if nvm_is_iojs_version "${VERSION}"
			then
				SLUG_BINARY="$(nvm_get_download_slug iojs binary std "${VERSION}")" 
				SLUG_SOURCE="$(nvm_get_download_slug iojs source std "${VERSION}")" 
			else
				SLUG_BINARY="$(nvm_get_download_slug node binary std "${VERSION}")" 
				SLUG_SOURCE="$(nvm_get_download_slug node source std "${VERSION}")" 
			fi
			local NVM_SUCCESS_MSG
			if nvm_is_iojs_version "${VERSION}"
			then
				NVM_SUCCESS_MSG="Uninstalled io.js $(nvm_strip_iojs_prefix "${VERSION}")" 
			else
				NVM_SUCCESS_MSG="Uninstalled node ${VERSION}" 
			fi
			local VERSION_PATH
			VERSION_PATH="$(nvm_version_path "${VERSION}")" 
			if ! nvm_check_file_permissions "${VERSION_PATH}"
			then
				nvm_err 'Cannot uninstall, incorrect permissions on installation folder.'
				nvm_err 'This is usually caused by running `npm install -g` as root. Run the following commands as root to fix the permissions and then try again.'
				nvm_err
				nvm_err "  chown -R $(whoami) \"$(nvm_sanitize_path "${VERSION_PATH}")\""
				nvm_err "  chmod -R u+w \"$(nvm_sanitize_path "${VERSION_PATH}")\""
				return 1
			fi
			local CACHE_DIR
			CACHE_DIR="$(nvm_cache_dir)" 
			command rm -rf "${CACHE_DIR}/bin/${SLUG_BINARY}/files" "${CACHE_DIR}/src/${SLUG_SOURCE}/files" "${VERSION_PATH}" 2> /dev/null
			nvm_echo "${NVM_SUCCESS_MSG}"
			for ALIAS in $(nvm_grep -l "${VERSION}" "$(nvm_alias_path)/*" 2>/dev/null)
			do
				nvm unalias "$(command basename "${ALIAS}")"
			done ;;
		("deactivate") local NVM_SILENT
			while [ $# -ne 0 ]
			do
				case "${1}" in
					(--silent) NVM_SILENT=1  ;;
					(--)  ;;
				esac
				shift
			done
			local NEWPATH
			NEWPATH="$(nvm_strip_path "${PATH}" "/bin")" 
			if [ "_${PATH}" = "_${NEWPATH}" ]
			then
				if [ "${NVM_SILENT:-0}" -ne 1 ]
				then
					nvm_err "Could not find ${NVM_DIR}/*/bin in \${PATH}"
				fi
			else
				export PATH="${NEWPATH}" 
				\hash -r
				if [ "${NVM_SILENT:-0}" -ne 1 ]
				then
					nvm_echo "${NVM_DIR}/*/bin removed from \${PATH}"
				fi
			fi
			if [ -n "${MANPATH-}" ]
			then
				NEWPATH="$(nvm_strip_path "${MANPATH}" "/share/man")" 
				if [ "_${MANPATH}" = "_${NEWPATH}" ]
				then
					if [ "${NVM_SILENT:-0}" -ne 1 ]
					then
						nvm_err "Could not find ${NVM_DIR}/*/share/man in \${MANPATH}"
					fi
				else
					export MANPATH="${NEWPATH}" 
					if [ "${NVM_SILENT:-0}" -ne 1 ]
					then
						nvm_echo "${NVM_DIR}/*/share/man removed from \${MANPATH}"
					fi
				fi
			fi
			if [ -n "${NODE_PATH-}" ]
			then
				NEWPATH="$(nvm_strip_path "${NODE_PATH}" "/lib/node_modules")" 
				if [ "_${NODE_PATH}" != "_${NEWPATH}" ]
				then
					export NODE_PATH="${NEWPATH}" 
					if [ "${NVM_SILENT:-0}" -ne 1 ]
					then
						nvm_echo "${NVM_DIR}/*/lib/node_modules removed from \${NODE_PATH}"
					fi
				fi
			fi
			unset NVM_BIN
			unset NVM_INC ;;
		("use") local PROVIDED_VERSION
			local NVM_SILENT
			local NVM_SILENT_ARG
			local NVM_DELETE_PREFIX
			NVM_DELETE_PREFIX=0 
			local NVM_LTS
			local IS_VERSION_FROM_NVMRC
			IS_VERSION_FROM_NVMRC=0 
			local NVM_WRITE_TO_NVMRC
			NVM_WRITE_TO_NVMRC=0 
			while [ $# -ne 0 ]
			do
				case "$1" in
					(--silent) NVM_SILENT=1 
						NVM_SILENT_ARG='--silent'  ;;
					(--delete-prefix) NVM_DELETE_PREFIX=1  ;;
					(--)  ;;
					(--lts) NVM_LTS='*'  ;;
					(--lts=*) NVM_LTS="${1##--lts=}"  ;;
					(--save | -w) if [ $NVM_WRITE_TO_NVMRC -eq 1 ]
						then
							nvm_err '--save and -w may only be provided once'
							return 6
						fi
						NVM_WRITE_TO_NVMRC=1  ;;
					(--*)  ;;
					(*) if [ -n "${1-}" ]
						then
							PROVIDED_VERSION="$1" 
						fi ;;
				esac
				shift
			done
			if [ -n "${NVM_LTS-}" ]
			then
				VERSION="$(nvm_match_version "lts/${NVM_LTS:-*}")" 
			elif [ -z "${PROVIDED_VERSION-}" ]
			then
				NVM_SILENT="${NVM_SILENT:-0}" nvm_rc_version
				if [ -n "${NVM_RC_VERSION-}" ]
				then
					PROVIDED_VERSION="${NVM_RC_VERSION}" 
					IS_VERSION_FROM_NVMRC=1 
					VERSION="$(nvm_version "${PROVIDED_VERSION}")" 
				fi
				unset NVM_RC_VERSION
				if [ -z "${VERSION}" ]
				then
					nvm_err 'Please see `nvm --help` or https://github.com/nvm-sh/nvm#nvmrc for more information.'
					return 127
				fi
			else
				VERSION="$(nvm_match_version "${PROVIDED_VERSION}")" 
			fi
			if [ -z "${VERSION}" ]
			then
				nvm --help >&2
				return 127
			fi
			if [ $NVM_WRITE_TO_NVMRC -eq 1 ]
			then
				nvm_write_nvmrc "${VERSION}"
			fi
			if [ "_${VERSION}" = '_system' ]
			then
				if nvm_has_system_node && nvm deactivate "${NVM_SILENT_ARG-}" > /dev/null 2>&1
				then
					if [ "${NVM_SILENT:-0}" -ne 1 ]
					then
						nvm_echo "Now using system version of node: $(node -v 2>/dev/null)$(nvm_print_npm_version)"
					fi
					return
				elif nvm_has_system_iojs && nvm deactivate "${NVM_SILENT_ARG-}" > /dev/null 2>&1
				then
					if [ "${NVM_SILENT:-0}" -ne 1 ]
					then
						nvm_echo "Now using system version of io.js: $(iojs --version 2>/dev/null)$(nvm_print_npm_version)"
					fi
					return
				elif [ "${NVM_SILENT:-0}" -ne 1 ]
				then
					nvm_err 'System version of node not found.'
				fi
				return 127
			elif [ "_${VERSION}" = '_∞' ]
			then
				if [ "${NVM_SILENT:-0}" -ne 1 ]
				then
					nvm_err "The alias \"${PROVIDED_VERSION}\" leads to an infinite loop. Aborting."
				fi
				return 8
			fi
			if [ "${VERSION}" = 'N/A' ]
			then
				if [ "${NVM_SILENT:-0}" -ne 1 ]
				then
					nvm_ensure_version_installed "${PROVIDED_VERSION}" "${IS_VERSION_FROM_NVMRC}"
				fi
				return 3
			elif ! nvm_ensure_version_installed "${VERSION}" "${IS_VERSION_FROM_NVMRC}"
			then
				return $?
			fi
			local NVM_VERSION_DIR
			NVM_VERSION_DIR="$(nvm_version_path "${VERSION}")" 
			PATH="$(nvm_change_path "${PATH}" "/bin" "${NVM_VERSION_DIR}")" 
			if nvm_has manpath
			then
				if [ -z "${MANPATH-}" ]
				then
					local MANPATH
					MANPATH=$(manpath) 
				fi
				MANPATH="$(nvm_change_path "${MANPATH}" "/share/man" "${NVM_VERSION_DIR}")" 
				export MANPATH
			fi
			export PATH
			\hash -r
			export NVM_BIN="${NVM_VERSION_DIR}/bin" 
			export NVM_INC="${NVM_VERSION_DIR}/include/node" 
			if [ "${NVM_SYMLINK_CURRENT-}" = true ]
			then
				command rm -f "${NVM_DIR}/current" && ln -s "${NVM_VERSION_DIR}" "${NVM_DIR}/current"
			fi
			local NVM_USE_OUTPUT
			NVM_USE_OUTPUT='' 
			if [ "${NVM_SILENT:-0}" -ne 1 ]
			then
				if nvm_is_iojs_version "${VERSION}"
				then
					NVM_USE_OUTPUT="Now using io.js $(nvm_strip_iojs_prefix "${VERSION}")$(nvm_print_npm_version)" 
				else
					NVM_USE_OUTPUT="Now using node ${VERSION}$(nvm_print_npm_version)" 
				fi
			fi
			if [ "_${VERSION}" != "_system" ]
			then
				local NVM_USE_CMD
				NVM_USE_CMD="nvm use --delete-prefix" 
				if [ -n "${PROVIDED_VERSION}" ]
				then
					NVM_USE_CMD="${NVM_USE_CMD} ${VERSION}" 
				fi
				if [ "${NVM_SILENT:-0}" -eq 1 ]
				then
					NVM_USE_CMD="${NVM_USE_CMD} --silent" 
				fi
				if ! nvm_die_on_prefix "${NVM_DELETE_PREFIX}" "${NVM_USE_CMD}" "${NVM_VERSION_DIR}"
				then
					return 11
				fi
			fi
			if [ -n "${NVM_USE_OUTPUT-}" ] && [ "${NVM_SILENT:-0}" -ne 1 ]
			then
				nvm_echo "${NVM_USE_OUTPUT}"
			fi ;;
		("run") local provided_version
			local has_checked_nvmrc
			has_checked_nvmrc=0 
			local IS_VERSION_FROM_NVMRC
			IS_VERSION_FROM_NVMRC=0 
			local NVM_SILENT
			local NVM_SILENT_ARG
			local NVM_LTS
			while [ $# -gt 0 ]
			do
				case "$1" in
					(--silent) NVM_SILENT=1 
						NVM_SILENT_ARG='--silent' 
						shift ;;
					(--lts) NVM_LTS='*' 
						shift ;;
					(--lts=*) NVM_LTS="${1##--lts=}" 
						shift ;;
					(*) if [ -n "$1" ]
						then
							break
						else
							shift
						fi ;;
				esac
			done
			if [ $# -lt 1 ] && [ -z "${NVM_LTS-}" ]
			then
				NVM_SILENT="${NVM_SILENT:-0}" nvm_rc_version && has_checked_nvmrc=1 
				if [ -n "${NVM_RC_VERSION-}" ]
				then
					VERSION="$(nvm_version "${NVM_RC_VERSION-}")"  || :
				fi
				unset NVM_RC_VERSION
				if [ "${VERSION:-N/A}" = 'N/A' ]
				then
					nvm --help >&2
					return 127
				fi
			fi
			if [ -z "${NVM_LTS-}" ]
			then
				provided_version="$1" 
				if [ -n "${provided_version}" ]
				then
					VERSION="$(nvm_version "${provided_version}")"  || :
					if [ "_${VERSION:-N/A}" = '_N/A' ] && ! nvm_is_valid_version "${provided_version}"
					then
						provided_version='' 
						if [ $has_checked_nvmrc -ne 1 ]
						then
							NVM_SILENT="${NVM_SILENT:-0}" nvm_rc_version && has_checked_nvmrc=1 
						fi
						provided_version="${NVM_RC_VERSION}" 
						IS_VERSION_FROM_NVMRC=1 
						VERSION="$(nvm_version "${NVM_RC_VERSION}")"  || :
						unset NVM_RC_VERSION
					else
						shift
					fi
				fi
			fi
			local NVM_IOJS
			if nvm_is_iojs_version "${VERSION}"
			then
				NVM_IOJS=true 
			fi
			local EXIT_CODE
			nvm_is_zsh && setopt local_options shwordsplit
			local LTS_ARG
			if [ -n "${NVM_LTS-}" ]
			then
				LTS_ARG="--lts=${NVM_LTS-}" 
				VERSION='' 
			fi
			if [ "_${VERSION}" = "_N/A" ]
			then
				nvm_ensure_version_installed "${provided_version}" "${IS_VERSION_FROM_NVMRC}"
			elif [ "${NVM_IOJS}" = true ]
			then
				nvm exec "${NVM_SILENT_ARG-}" "${LTS_ARG-}" "${VERSION}" iojs "$@"
			else
				nvm exec "${NVM_SILENT_ARG-}" "${LTS_ARG-}" "${VERSION}" node "$@"
			fi
			EXIT_CODE="$?" 
			return $EXIT_CODE ;;
		("exec") local NVM_SILENT
			local NVM_LTS
			while [ $# -gt 0 ]
			do
				case "$1" in
					(--silent) NVM_SILENT=1 
						shift ;;
					(--lts) NVM_LTS='*' 
						shift ;;
					(--lts=*) NVM_LTS="${1##--lts=}" 
						shift ;;
					(--) break ;;
					(--*) nvm_err "Unsupported option \"$1\"."
						return 55 ;;
					(*) if [ -n "$1" ]
						then
							break
						else
							shift
						fi ;;
				esac
			done
			local provided_version
			provided_version="$1" 
			if [ "${NVM_LTS-}" != '' ]
			then
				provided_version="lts/${NVM_LTS:-*}" 
				VERSION="${provided_version}" 
			elif [ -n "${provided_version}" ]
			then
				VERSION="$(nvm_version "${provided_version}")"  || :
				if [ "_${VERSION}" = '_N/A' ] && ! nvm_is_valid_version "${provided_version}"
				then
					NVM_SILENT="${NVM_SILENT:-0}" nvm_rc_version && has_checked_nvmrc=1 
					provided_version="${NVM_RC_VERSION}" 
					unset NVM_RC_VERSION
					VERSION="$(nvm_version "${provided_version}")"  || :
				else
					shift
				fi
			fi
			nvm_ensure_version_installed "${provided_version}"
			EXIT_CODE=$? 
			if [ "${EXIT_CODE}" != "0" ]
			then
				return $EXIT_CODE
			fi
			if [ "${NVM_SILENT:-0}" -ne 1 ]
			then
				if [ "${NVM_LTS-}" = '*' ]
				then
					nvm_echo "Running node latest LTS -> $(nvm_version "${VERSION}")$(nvm use --silent "${VERSION}" && nvm_print_npm_version)"
				elif [ -n "${NVM_LTS-}" ]
				then
					nvm_echo "Running node LTS \"${NVM_LTS-}\" -> $(nvm_version "${VERSION}")$(nvm use --silent "${VERSION}" && nvm_print_npm_version)"
				elif nvm_is_iojs_version "${VERSION}"
				then
					nvm_echo "Running io.js $(nvm_strip_iojs_prefix "${VERSION}")$(nvm use --silent "${VERSION}" && nvm_print_npm_version)"
				else
					nvm_echo "Running node ${VERSION}$(nvm use --silent "${VERSION}" && nvm_print_npm_version)"
				fi
			fi
			NODE_VERSION="${VERSION}" "${NVM_DIR}/nvm-exec" "$@" ;;
		("ls" | "list") local PATTERN
			local NVM_NO_COLORS
			local NVM_NO_ALIAS
			while [ $# -gt 0 ]
			do
				case "${1}" in
					(--)  ;;
					(--no-colors) NVM_NO_COLORS="${1}"  ;;
					(--no-alias) NVM_NO_ALIAS="${1}"  ;;
					(--*) nvm_err "Unsupported option \"${1}\"."
						return 55 ;;
					(*) PATTERN="${PATTERN:-$1}"  ;;
				esac
				shift
			done
			if [ -n "${PATTERN-}" ] && [ -n "${NVM_NO_ALIAS-}" ]
			then
				nvm_err '`--no-alias` is not supported when a pattern is provided.'
				return 55
			fi
			local NVM_LS_OUTPUT
			local NVM_LS_EXIT_CODE
			NVM_LS_OUTPUT=$(nvm_ls "${PATTERN-}") 
			NVM_LS_EXIT_CODE=$? 
			NVM_NO_COLORS="${NVM_NO_COLORS-}" nvm_print_versions "${NVM_LS_OUTPUT}"
			if [ -z "${NVM_NO_ALIAS-}" ] && [ -z "${PATTERN-}" ]
			then
				if [ -n "${NVM_NO_COLORS-}" ]
				then
					nvm alias --no-colors
				else
					nvm alias
				fi
			fi
			return $NVM_LS_EXIT_CODE ;;
		("ls-remote" | "list-remote") local NVM_LTS
			local PATTERN
			local NVM_NO_COLORS
			while [ $# -gt 0 ]
			do
				case "${1-}" in
					(--)  ;;
					(--lts) NVM_LTS='*'  ;;
					(--lts=*) NVM_LTS="${1##--lts=}"  ;;
					(--no-colors) NVM_NO_COLORS="${1}"  ;;
					(--*) nvm_err "Unsupported option \"${1}\"."
						return 55 ;;
					(*) if [ -z "${PATTERN-}" ]
						then
							PATTERN="${1-}" 
							if [ -z "${NVM_LTS-}" ]
							then
								case "${PATTERN}" in
									('lts/*') NVM_LTS='*' 
										PATTERN=''  ;;
									(lts/*) NVM_LTS="${PATTERN##lts/}" 
										PATTERN=''  ;;
								esac
							fi
						fi ;;
				esac
				shift
			done
			local NVM_OUTPUT
			local EXIT_CODE
			NVM_OUTPUT="$(NVM_LTS="${NVM_LTS-}" nvm_remote_versions "${PATTERN}" &&:)" 
			EXIT_CODE=$? 
			if [ -n "${NVM_OUTPUT}" ]
			then
				NVM_NO_COLORS="${NVM_NO_COLORS-}" nvm_print_versions "${NVM_OUTPUT}"
				return $EXIT_CODE
			fi
			NVM_NO_COLORS="${NVM_NO_COLORS-}" nvm_print_versions "N/A"
			return 3 ;;
		("current") nvm_version current ;;
		("which") local NVM_SILENT
			local provided_version
			while [ $# -ne 0 ]
			do
				case "${1}" in
					(--silent) NVM_SILENT=1  ;;
					(--)  ;;
					(*) provided_version="${1-}"  ;;
				esac
				shift
			done
			if [ -z "${provided_version-}" ]
			then
				NVM_SILENT="${NVM_SILENT:-0}" nvm_rc_version
				if [ -n "${NVM_RC_VERSION}" ]
				then
					provided_version="${NVM_RC_VERSION}" 
					VERSION=$(nvm_version "${NVM_RC_VERSION}")  || :
				fi
				unset NVM_RC_VERSION
			elif [ "${provided_version}" != 'system' ]
			then
				VERSION="$(nvm_version "${provided_version}")"  || :
			else
				VERSION="${provided_version-}" 
			fi
			if [ -z "${VERSION}" ]
			then
				nvm --help >&2
				return 127
			fi
			if [ "_${VERSION}" = '_system' ]
			then
				if nvm_has_system_iojs > /dev/null 2>&1 || nvm_has_system_node > /dev/null 2>&1
				then
					local NVM_BIN
					NVM_BIN="$(nvm use system >/dev/null 2>&1 && command which node)" 
					if [ -n "${NVM_BIN}" ]
					then
						nvm_echo "${NVM_BIN}"
						return
					fi
					return 1
				fi
				nvm_err 'System version of node not found.'
				return 127
			elif [ "${VERSION}" = '∞' ]
			then
				nvm_err "The alias \"${2}\" leads to an infinite loop. Aborting."
				return 8
			fi
			nvm_ensure_version_installed "${provided_version}"
			EXIT_CODE=$? 
			if [ "${EXIT_CODE}" != "0" ]
			then
				return $EXIT_CODE
			fi
			local NVM_VERSION_DIR
			NVM_VERSION_DIR="$(nvm_version_path "${VERSION}")" 
			nvm_echo "${NVM_VERSION_DIR}/bin/node" ;;
		("alias") local NVM_ALIAS_DIR
			NVM_ALIAS_DIR="$(nvm_alias_path)" 
			local NVM_CURRENT
			NVM_CURRENT="$(nvm_ls_current)" 
			command mkdir -p "${NVM_ALIAS_DIR}/lts"
			local ALIAS
			local TARGET
			local NVM_NO_COLORS
			ALIAS='--' 
			TARGET='--' 
			while [ $# -gt 0 ]
			do
				case "${1-}" in
					(--)  ;;
					(--no-colors) NVM_NO_COLORS="${1}"  ;;
					(--*) nvm_err "Unsupported option \"${1}\"."
						return 55 ;;
					(*) if [ "${ALIAS}" = '--' ]
						then
							ALIAS="${1-}" 
						elif [ "${TARGET}" = '--' ]
						then
							TARGET="${1-}" 
						fi ;;
				esac
				shift
			done
			if [ -z "${TARGET}" ]
			then
				nvm unalias "${ALIAS}"
				return $?
			elif echo "${ALIAS}" | grep -q "#"
			then
				nvm_err 'Aliases with a comment delimiter (#) are not supported.'
				return 1
			elif [ "${TARGET}" != '--' ]
			then
				if [ "${ALIAS#*\/}" != "${ALIAS}" ]
				then
					nvm_err 'Aliases in subdirectories are not supported.'
					return 1
				fi
				VERSION="$(nvm_version "${TARGET}")"  || :
				if [ "${VERSION}" = 'N/A' ]
				then
					nvm_err "! WARNING: Version '${TARGET}' does not exist."
				fi
				nvm_make_alias "${ALIAS}" "${TARGET}"
				NVM_NO_COLORS="${NVM_NO_COLORS-}" NVM_CURRENT="${NVM_CURRENT-}" DEFAULT=false nvm_print_formatted_alias "${ALIAS}" "${TARGET}" "${VERSION}"
			else
				if [ "${ALIAS-}" = '--' ]
				then
					unset ALIAS
				fi
				nvm_list_aliases "${ALIAS-}"
			fi ;;
		("unalias") local NVM_ALIAS_DIR
			NVM_ALIAS_DIR="$(nvm_alias_path)" 
			command mkdir -p "${NVM_ALIAS_DIR}"
			if [ $# -ne 1 ]
			then
				nvm --help >&2
				return 127
			fi
			if [ "${1#*\/}" != "${1-}" ]
			then
				nvm_err 'Aliases in subdirectories are not supported.'
				return 1
			fi
			local NVM_IOJS_PREFIX
			local NVM_NODE_PREFIX
			NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
			NVM_NODE_PREFIX="$(nvm_node_prefix)" 
			local NVM_ALIAS_EXISTS
			NVM_ALIAS_EXISTS=0 
			if [ -f "${NVM_ALIAS_DIR}/${1-}" ]
			then
				NVM_ALIAS_EXISTS=1 
			fi
			if [ $NVM_ALIAS_EXISTS -eq 0 ]
			then
				case "$1" in
					("stable" | "unstable" | "${NVM_IOJS_PREFIX}" | "${NVM_NODE_PREFIX}" | "system") nvm_err "${1-} is a default (built-in) alias and cannot be deleted."
						return 1 ;;
				esac
				nvm_err "Alias ${1-} doesn't exist!"
				return
			fi
			local NVM_ALIAS_ORIGINAL
			NVM_ALIAS_ORIGINAL="$(nvm_alias "${1}")" 
			command rm -f "${NVM_ALIAS_DIR}/${1}"
			nvm_echo "Deleted alias ${1} - restore it with \`nvm alias \"${1}\" \"${NVM_ALIAS_ORIGINAL}\"\`" ;;
		("install-latest-npm") if [ $# -ne 0 ]
			then
				nvm --help >&2
				return 127
			fi
			nvm_install_latest_npm ;;
		("reinstall-packages" | "copy-packages") if [ $# -ne 1 ]
			then
				nvm --help >&2
				return 127
			fi
			local PROVIDED_VERSION
			PROVIDED_VERSION="${1-}" 
			if [ "${PROVIDED_VERSION}" = "$(nvm_ls_current)" ] || [ "$(nvm_version "${PROVIDED_VERSION}" ||:)" = "$(nvm_ls_current)" ]
			then
				nvm_err 'Can not reinstall packages from the current version of node.'
				return 2
			fi
			local VERSION
			if [ "_${PROVIDED_VERSION}" = "_system" ]
			then
				if ! nvm_has_system_node && ! nvm_has_system_iojs
				then
					nvm_err 'No system version of node or io.js detected.'
					return 3
				fi
				VERSION="system" 
			else
				VERSION="$(nvm_version "${PROVIDED_VERSION}")"  || :
			fi
			local NPMLIST
			NPMLIST="$(nvm_npm_global_modules "${VERSION}")" 
			local INSTALLS
			local LINKS
			INSTALLS="${NPMLIST%% //// *}" 
			LINKS="${NPMLIST##* //// }" 
			nvm_echo "Reinstalling global packages from ${VERSION}..."
			if [ -n "${INSTALLS}" ]
			then
				nvm_echo "${INSTALLS}" | command xargs npm install -g --quiet
			else
				nvm_echo "No installed global packages found..."
			fi
			nvm_echo "Linking global packages from ${VERSION}..."
			if [ -n "${LINKS}" ]
			then
				(
					set -f
					IFS='
' 
					for LINK in ${LINKS}
					do
						set +f
						unset IFS
						if [ -n "${LINK}" ]
						then
							case "${LINK}" in
								('/'*) (
										nvm_cd "${LINK}" && npm link
									) ;;
								(*) (
										nvm_cd "$(npm root -g)/../${LINK}" && npm link
									) ;;
							esac
						fi
					done
				)
			else
				nvm_echo "No linked global packages found..."
			fi ;;
		("clear-cache") command rm -f "${NVM_DIR}/v*" "$(nvm_version_dir)" 2> /dev/null
			nvm_echo 'nvm cache cleared.' ;;
		("version") nvm_version "${1}" ;;
		("version-remote") local NVM_LTS
			local PATTERN
			while [ $# -gt 0 ]
			do
				case "${1-}" in
					(--)  ;;
					(--lts) NVM_LTS='*'  ;;
					(--lts=*) NVM_LTS="${1##--lts=}"  ;;
					(--*) nvm_err "Unsupported option \"${1}\"."
						return 55 ;;
					(*) PATTERN="${PATTERN:-${1}}"  ;;
				esac
				shift
			done
			case "${PATTERN-}" in
				('lts/*') NVM_LTS='*' 
					unset PATTERN ;;
				(lts/*) NVM_LTS="${PATTERN##lts/}" 
					unset PATTERN ;;
			esac
			NVM_VERSION_ONLY=true NVM_LTS="${NVM_LTS-}" nvm_remote_version "${PATTERN:-node}" ;;
		("--version" | "-v") nvm_echo '0.40.3' ;;
		("unload") nvm deactivate > /dev/null 2>&1
			unset -f nvm nvm_iojs_prefix nvm_node_prefix nvm_add_iojs_prefix nvm_strip_iojs_prefix nvm_is_iojs_version nvm_is_alias nvm_has_non_aliased nvm_ls_remote nvm_ls_remote_iojs nvm_ls_remote_index_tab nvm_ls nvm_remote_version nvm_remote_versions nvm_install_binary nvm_install_source nvm_clang_version nvm_get_mirror nvm_get_download_slug nvm_download_artifact nvm_install_npm_if_needed nvm_use_if_needed nvm_check_file_permissions nvm_print_versions nvm_compute_checksum nvm_get_checksum_binary nvm_get_checksum_alg nvm_get_checksum nvm_compare_checksum nvm_version nvm_rc_version nvm_match_version nvm_ensure_default_set nvm_get_arch nvm_get_os nvm_print_implicit_alias nvm_validate_implicit_alias nvm_resolve_alias nvm_ls_current nvm_alias nvm_binary_available nvm_change_path nvm_strip_path nvm_num_version_groups nvm_format_version nvm_ensure_version_prefix nvm_normalize_version nvm_is_valid_version nvm_normalize_lts nvm_ensure_version_installed nvm_cache_dir nvm_version_path nvm_alias_path nvm_version_dir nvm_find_nvmrc nvm_find_up nvm_find_project_dir nvm_tree_contains_path nvm_version_greater nvm_version_greater_than_or_equal_to nvm_print_npm_version nvm_install_latest_npm nvm_npm_global_modules nvm_has_system_node nvm_has_system_iojs nvm_download nvm_get_latest nvm_has nvm_install_default_packages nvm_get_default_packages nvm_curl_use_compression nvm_curl_version nvm_auto nvm_supports_xz nvm_echo nvm_err nvm_grep nvm_cd nvm_die_on_prefix nvm_get_make_jobs nvm_get_minor_version nvm_has_solaris_binary nvm_is_merged_node_version nvm_is_natural_num nvm_is_version_installed nvm_list_aliases nvm_make_alias nvm_print_alias_path nvm_print_default_alias nvm_print_formatted_alias nvm_resolve_local_alias nvm_sanitize_path nvm_has_colors nvm_process_parameters nvm_node_version_has_solaris_binary nvm_iojs_version_has_solaris_binary nvm_curl_libz_support nvm_command_info nvm_is_zsh nvm_stdout_is_terminal nvm_npmrc_bad_news_bears nvm_sanitize_auth_header nvm_get_colors nvm_set_colors nvm_print_color_code nvm_wrap_with_color_code nvm_format_help_message_colors nvm_echo_with_colors nvm_err_with_colors nvm_get_artifact_compression nvm_install_binary_extract nvm_extract_tarball nvm_process_nvmrc nvm_nvmrc_invalid_msg nvm_write_nvmrc > /dev/null 2>&1
			unset NVM_RC_VERSION NVM_NODEJS_ORG_MIRROR NVM_IOJS_ORG_MIRROR NVM_DIR NVM_CD_FLAGS NVM_BIN NVM_INC NVM_MAKE_JOBS NVM_COLORS INSTALLED_COLOR SYSTEM_COLOR CURRENT_COLOR NOT_INSTALLED_COLOR DEFAULT_COLOR LTS_COLOR > /dev/null 2>&1 ;;
		("set-colors") local EXIT_CODE
			nvm_set_colors "${1-}"
			EXIT_CODE=$? 
			if [ "$EXIT_CODE" -eq 17 ]
			then
				nvm --help >&2
				nvm_echo
				nvm_err_with_colors "\033[1;37mPlease pass in five \033[1;31mvalid color codes\033[1;37m. Choose from: rRgGbBcCyYmMkKeW\033[0m"
			fi ;;
		(*) nvm --help >&2
			return 127 ;;
	esac
}
nvm_add_iojs_prefix () {
	nvm_echo "$(nvm_iojs_prefix)-$(nvm_ensure_version_prefix "$(nvm_strip_iojs_prefix "${1-}")")"
}
nvm_alias () {
	local ALIAS
	ALIAS="${1-}" 
	if [ -z "${ALIAS}" ]
	then
		nvm_err 'An alias is required.'
		return 1
	fi
	if ! ALIAS="$(nvm_normalize_lts "${ALIAS}")" 
	then
		return $?
	fi
	if [ -z "${ALIAS}" ]
	then
		return 2
	fi
	local NVM_ALIAS_PATH
	NVM_ALIAS_PATH="$(nvm_alias_path)/${ALIAS}" 
	if [ ! -f "${NVM_ALIAS_PATH}" ]
	then
		nvm_err 'Alias does not exist.'
		return 2
	fi
	command awk 'NF' "${NVM_ALIAS_PATH}"
}
nvm_alias_path () {
	nvm_echo "$(nvm_version_dir old)/alias"
}
nvm_auto () {
	local NVM_MODE
	NVM_MODE="${1-}" 
	case "${NVM_MODE}" in
		(none) return 0 ;;
		(use) local VERSION
			local NVM_CURRENT
			NVM_CURRENT="$(nvm_ls_current)" 
			if [ "_${NVM_CURRENT}" = '_none' ] || [ "_${NVM_CURRENT}" = '_system' ]
			then
				VERSION="$(nvm_resolve_local_alias default 2>/dev/null || nvm_echo)" 
				if [ -n "${VERSION}" ]
				then
					if [ "_${VERSION}" != '_N/A' ] && nvm_is_valid_version "${VERSION}"
					then
						nvm use --silent "${VERSION}" > /dev/null
					else
						return 0
					fi
				elif nvm_rc_version > /dev/null 2>&1
				then
					nvm use --silent > /dev/null
				fi
			else
				nvm use --silent "${NVM_CURRENT}" > /dev/null
			fi ;;
		(install) local VERSION
			VERSION="$(nvm_alias default 2>/dev/null || nvm_echo)" 
			if [ -n "${VERSION}" ] && [ "_${VERSION}" != '_N/A' ] && nvm_is_valid_version "${VERSION}"
			then
				nvm install "${VERSION}" > /dev/null
			elif nvm_rc_version > /dev/null 2>&1
			then
				nvm install > /dev/null
			else
				return 0
			fi ;;
		(*) nvm_err 'Invalid auto mode supplied.'
			return 1 ;;
	esac
}
nvm_binary_available () {
	nvm_version_greater_than_or_equal_to "$(nvm_strip_iojs_prefix "${1-}")" v0.8.6
}
nvm_cache_dir () {
	nvm_echo "${NVM_DIR}/.cache"
}
nvm_cd () {
	\cd "$@"
}
nvm_change_path () {
	if [ -z "${1-}" ]
	then
		nvm_echo "${3-}${2-}"
	elif ! nvm_echo "${1-}" | nvm_grep -q "${NVM_DIR}/[^/]*${2-}" && ! nvm_echo "${1-}" | nvm_grep -q "${NVM_DIR}/versions/[^/]*/[^/]*${2-}"
	then
		nvm_echo "${3-}${2-}:${1-}"
	elif nvm_echo "${1-}" | nvm_grep -Eq "(^|:)(/usr(/local)?)?${2-}:.*${NVM_DIR}/[^/]*${2-}" || nvm_echo "${1-}" | nvm_grep -Eq "(^|:)(/usr(/local)?)?${2-}:.*${NVM_DIR}/versions/[^/]*/[^/]*${2-}"
	then
		nvm_echo "${3-}${2-}:${1-}"
	else
		nvm_echo "${1-}" | command sed -e "s#${NVM_DIR}/[^/]*${2-}[^:]*#${3-}${2-}#" -e "s#${NVM_DIR}/versions/[^/]*/[^/]*${2-}[^:]*#${3-}${2-}#"
	fi
}
nvm_check_file_permissions () {
	nvm_is_zsh && setopt local_options nonomatch
	for FILE in "$1"/* "$1"/.[!.]* "$1"/..?*
	do
		if [ -d "$FILE" ]
		then
			if [ -n "${NVM_DEBUG-}" ]
			then
				nvm_err "${FILE}"
			fi
			if [ ! -L "${FILE}" ] && ! nvm_check_file_permissions "${FILE}"
			then
				return 2
			fi
		elif [ -e "$FILE" ] && [ ! -w "$FILE" ] && [ ! -O "$FILE" ]
		then
			nvm_err "file is not writable or self-owned: $(nvm_sanitize_path "$FILE")"
			return 1
		fi
	done
	return 0
}
nvm_clang_version () {
	clang --version | command awk '{ if ($2 == "version") print $3; else if ($3 == "version") print $4 }' | command sed 's/-.*$//g'
}
nvm_command_info () {
	local COMMAND
	local INFO
	COMMAND="${1}" 
	if type "${COMMAND}" | nvm_grep -q hashed
	then
		INFO="$(type "${COMMAND}" | command sed -E 's/\(|\)//g' | command awk '{print $4}')" 
	elif type "${COMMAND}" | nvm_grep -q aliased
	then
		INFO="$(which "${COMMAND}") ($(type "${COMMAND}" | command awk '{ $1=$2=$3=$4="" ;print }' | command sed -e 's/^\ *//g' -Ee "s/\`|'//g"))" 
	elif type "${COMMAND}" | nvm_grep -q "^${COMMAND} is an alias for"
	then
		INFO="$(which "${COMMAND}") ($(type "${COMMAND}" | command awk '{ $1=$2=$3=$4=$5="" ;print }' | command sed 's/^\ *//g'))" 
	elif type "${COMMAND}" | nvm_grep -q "^${COMMAND} is /"
	then
		INFO="$(type "${COMMAND}" | command awk '{print $3}')" 
	else
		INFO="$(type "${COMMAND}")" 
	fi
	nvm_echo "${INFO}"
}
nvm_compare_checksum () {
	local FILE
	FILE="${1-}" 
	if [ -z "${FILE}" ]
	then
		nvm_err 'Provided file to checksum is empty.'
		return 4
	elif ! [ -f "${FILE}" ]
	then
		nvm_err 'Provided file to checksum does not exist.'
		return 3
	fi
	local COMPUTED_SUM
	COMPUTED_SUM="$(nvm_compute_checksum "${FILE}")" 
	local CHECKSUM
	CHECKSUM="${2-}" 
	if [ -z "${CHECKSUM}" ]
	then
		nvm_err 'Provided checksum to compare to is empty.'
		return 2
	fi
	if [ -z "${COMPUTED_SUM}" ]
	then
		nvm_err "Computed checksum of '${FILE}' is empty."
		nvm_err 'WARNING: Continuing *without checksum verification*'
		return
	elif [ "${COMPUTED_SUM}" != "${CHECKSUM}" ] && [ "${COMPUTED_SUM}" != "\\${CHECKSUM}" ]
	then
		nvm_err "Checksums do not match: '${COMPUTED_SUM}' found, '${CHECKSUM}' expected."
		return 1
	fi
	nvm_err 'Checksums matched!'
}
nvm_compute_checksum () {
	local FILE
	FILE="${1-}" 
	if [ -z "${FILE}" ]
	then
		nvm_err 'Provided file to checksum is empty.'
		return 2
	elif ! [ -f "${FILE}" ]
	then
		nvm_err 'Provided file to checksum does not exist.'
		return 1
	fi
	if nvm_has_non_aliased "sha256sum"
	then
		nvm_err 'Computing checksum with sha256sum'
		command sha256sum "${FILE}" | command awk '{print $1}'
	elif nvm_has_non_aliased "shasum"
	then
		nvm_err 'Computing checksum with shasum -a 256'
		command shasum -a 256 "${FILE}" | command awk '{print $1}'
	elif nvm_has_non_aliased "sha256"
	then
		nvm_err 'Computing checksum with sha256 -q'
		command sha256 -q "${FILE}" | command awk '{print $1}'
	elif nvm_has_non_aliased "gsha256sum"
	then
		nvm_err 'Computing checksum with gsha256sum'
		command gsha256sum "${FILE}" | command awk '{print $1}'
	elif nvm_has_non_aliased "openssl"
	then
		nvm_err 'Computing checksum with openssl dgst -sha256'
		command openssl dgst -sha256 "${FILE}" | command awk '{print $NF}'
	elif nvm_has_non_aliased "bssl"
	then
		nvm_err 'Computing checksum with bssl sha256sum'
		command bssl sha256sum "${FILE}" | command awk '{print $1}'
	elif nvm_has_non_aliased "sha1sum"
	then
		nvm_err 'Computing checksum with sha1sum'
		command sha1sum "${FILE}" | command awk '{print $1}'
	elif nvm_has_non_aliased "sha1"
	then
		nvm_err 'Computing checksum with sha1 -q'
		command sha1 -q "${FILE}"
	fi
}
nvm_curl_libz_support () {
	curl -V 2> /dev/null | nvm_grep "^Features:" | nvm_grep -q "libz"
}
nvm_curl_use_compression () {
	nvm_curl_libz_support && nvm_version_greater_than_or_equal_to "$(nvm_curl_version)" 7.21.0
}
nvm_curl_version () {
	curl -V | command awk '{ if ($1 == "curl") print $2 }' | command sed 's/-.*$//g'
}
nvm_die_on_prefix () {
	local NVM_DELETE_PREFIX
	NVM_DELETE_PREFIX="${1-}" 
	case "${NVM_DELETE_PREFIX}" in
		(0 | 1)  ;;
		(*) nvm_err 'First argument "delete the prefix" must be zero or one'
			return 1 ;;
	esac
	local NVM_COMMAND
	NVM_COMMAND="${2-}" 
	local NVM_VERSION_DIR
	NVM_VERSION_DIR="${3-}" 
	if [ -z "${NVM_COMMAND}" ] || [ -z "${NVM_VERSION_DIR}" ]
	then
		nvm_err 'Second argument "nvm command", and third argument "nvm version dir", must both be nonempty'
		return 2
	fi
	if [ -n "${PREFIX-}" ] && [ "$(nvm_version_path "$(node -v)")" != "${PREFIX}" ]
	then
		nvm deactivate > /dev/null 2>&1
		nvm_err "nvm is not compatible with the \"PREFIX\" environment variable: currently set to \"${PREFIX}\""
		nvm_err 'Run `unset PREFIX` to unset it.'
		return 3
	fi
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	local NVM_NPM_CONFIG_x_PREFIX_ENV
	NVM_NPM_CONFIG_x_PREFIX_ENV="$(command awk 'BEGIN { for (name in ENVIRON) if (toupper(name) == "NPM_CONFIG_PREFIX") { print name; break } }')" 
	if [ -n "${NVM_NPM_CONFIG_x_PREFIX_ENV-}" ]
	then
		local NVM_CONFIG_VALUE
		eval "NVM_CONFIG_VALUE=\"\$${NVM_NPM_CONFIG_x_PREFIX_ENV}\""
		if [ -n "${NVM_CONFIG_VALUE-}" ] && [ "_${NVM_OS}" = "_win" ]
		then
			NVM_CONFIG_VALUE="$(cd "$NVM_CONFIG_VALUE" 2>/dev/null && pwd)" 
		fi
		if [ -n "${NVM_CONFIG_VALUE-}" ] && ! nvm_tree_contains_path "${NVM_DIR}" "${NVM_CONFIG_VALUE}"
		then
			nvm deactivate > /dev/null 2>&1
			nvm_err "nvm is not compatible with the \"${NVM_NPM_CONFIG_x_PREFIX_ENV}\" environment variable: currently set to \"${NVM_CONFIG_VALUE}\""
			nvm_err "Run \`unset ${NVM_NPM_CONFIG_x_PREFIX_ENV}\` to unset it."
			return 4
		fi
	fi
	local NVM_NPM_BUILTIN_NPMRC
	NVM_NPM_BUILTIN_NPMRC="${NVM_VERSION_DIR}/lib/node_modules/npm/npmrc" 
	if nvm_npmrc_bad_news_bears "${NVM_NPM_BUILTIN_NPMRC}"
	then
		if [ "_${NVM_DELETE_PREFIX}" = "_1" ]
		then
			npm config --loglevel=warn delete prefix --userconfig="${NVM_NPM_BUILTIN_NPMRC}"
			npm config --loglevel=warn delete globalconfig --userconfig="${NVM_NPM_BUILTIN_NPMRC}"
		else
			nvm_err "Your builtin npmrc file ($(nvm_sanitize_path "${NVM_NPM_BUILTIN_NPMRC}"))"
			nvm_err 'has a `globalconfig` and/or a `prefix` setting, which are incompatible with nvm.'
			nvm_err "Run \`${NVM_COMMAND}\` to unset it."
			return 10
		fi
	fi
	local NVM_NPM_GLOBAL_NPMRC
	NVM_NPM_GLOBAL_NPMRC="${NVM_VERSION_DIR}/etc/npmrc" 
	if nvm_npmrc_bad_news_bears "${NVM_NPM_GLOBAL_NPMRC}"
	then
		if [ "_${NVM_DELETE_PREFIX}" = "_1" ]
		then
			npm config --global --loglevel=warn delete prefix
			npm config --global --loglevel=warn delete globalconfig
		else
			nvm_err "Your global npmrc file ($(nvm_sanitize_path "${NVM_NPM_GLOBAL_NPMRC}"))"
			nvm_err 'has a `globalconfig` and/or a `prefix` setting, which are incompatible with nvm.'
			nvm_err "Run \`${NVM_COMMAND}\` to unset it."
			return 10
		fi
	fi
	local NVM_NPM_USER_NPMRC
	NVM_NPM_USER_NPMRC="${HOME}/.npmrc" 
	if nvm_npmrc_bad_news_bears "${NVM_NPM_USER_NPMRC}"
	then
		if [ "_${NVM_DELETE_PREFIX}" = "_1" ]
		then
			npm config --loglevel=warn delete prefix --userconfig="${NVM_NPM_USER_NPMRC}"
			npm config --loglevel=warn delete globalconfig --userconfig="${NVM_NPM_USER_NPMRC}"
		else
			nvm_err "Your user’s .npmrc file ($(nvm_sanitize_path "${NVM_NPM_USER_NPMRC}"))"
			nvm_err 'has a `globalconfig` and/or a `prefix` setting, which are incompatible with nvm.'
			nvm_err "Run \`${NVM_COMMAND}\` to unset it."
			return 10
		fi
	fi
	local NVM_NPM_PROJECT_NPMRC
	NVM_NPM_PROJECT_NPMRC="$(nvm_find_project_dir)/.npmrc" 
	if nvm_npmrc_bad_news_bears "${NVM_NPM_PROJECT_NPMRC}"
	then
		if [ "_${NVM_DELETE_PREFIX}" = "_1" ]
		then
			npm config --loglevel=warn delete prefix
			npm config --loglevel=warn delete globalconfig
		else
			nvm_err "Your project npmrc file ($(nvm_sanitize_path "${NVM_NPM_PROJECT_NPMRC}"))"
			nvm_err 'has a `globalconfig` and/or a `prefix` setting, which are incompatible with nvm.'
			nvm_err "Run \`${NVM_COMMAND}\` to unset it."
			return 10
		fi
	fi
}
nvm_download () {
	if nvm_has "curl"
	then
		local CURL_COMPRESSED_FLAG="" 
		local CURL_HEADER_FLAG="" 
		if [ -n "${NVM_AUTH_HEADER:-}" ]
		then
			sanitized_header=$(nvm_sanitize_auth_header "${NVM_AUTH_HEADER}") 
			CURL_HEADER_FLAG="--header \"Authorization: ${sanitized_header}\"" 
		fi
		if nvm_curl_use_compression
		then
			CURL_COMPRESSED_FLAG="--compressed" 
		fi
		local NVM_DOWNLOAD_ARGS
		NVM_DOWNLOAD_ARGS='' 
		for arg in "$@"
		do
			NVM_DOWNLOAD_ARGS="${NVM_DOWNLOAD_ARGS} \"$arg\"" 
		done
		eval "curl -q --fail ${CURL_COMPRESSED_FLAG:-} ${CURL_HEADER_FLAG:-} ${NVM_DOWNLOAD_ARGS}"
	elif nvm_has "wget"
	then
		ARGS=$(nvm_echo "$@" | command sed "
      s/--progress-bar /--progress=bar /
      s/--compressed //
      s/--fail //
      s/-L //
      s/-I /--server-response /
      s/-s /-q /
      s/-sS /-nv /
      s/-o /-O /
      s/-C - /-c /
    ") 
		if [ -n "${NVM_AUTH_HEADER:-}" ]
		then
			ARGS="${ARGS} --header \"${NVM_AUTH_HEADER}\"" 
		fi
		eval wget $ARGS
	fi
}
nvm_download_artifact () {
	local FLAVOR
	case "${1-}" in
		(node | iojs) FLAVOR="${1}"  ;;
		(*) nvm_err 'supported flavors: node, iojs'
			return 1 ;;
	esac
	local KIND
	case "${2-}" in
		(binary | source) KIND="${2}"  ;;
		(*) nvm_err 'supported kinds: binary, source'
			return 1 ;;
	esac
	local TYPE
	TYPE="${3-}" 
	local MIRROR
	MIRROR="$(nvm_get_mirror "${FLAVOR}" "${TYPE}")" 
	if [ -z "${MIRROR}" ]
	then
		return 2
	fi
	local VERSION
	VERSION="${4}" 
	if [ -z "${VERSION}" ]
	then
		nvm_err 'A version number is required.'
		return 3
	fi
	if [ "${KIND}" = 'binary' ] && ! nvm_binary_available "${VERSION}"
	then
		nvm_err "No precompiled binary available for ${VERSION}."
		return
	fi
	local SLUG
	SLUG="$(nvm_get_download_slug "${FLAVOR}" "${KIND}" "${VERSION}")" 
	local COMPRESSION
	COMPRESSION="$(nvm_get_artifact_compression "${VERSION}")" 
	local CHECKSUM
	CHECKSUM="$(nvm_get_checksum "${FLAVOR}" "${TYPE}" "${VERSION}" "${SLUG}" "${COMPRESSION}")" 
	local tmpdir
	if [ "${KIND}" = 'binary' ]
	then
		tmpdir="$(nvm_cache_dir)/bin/${SLUG}" 
	else
		tmpdir="$(nvm_cache_dir)/src/${SLUG}" 
	fi
	command mkdir -p "${tmpdir}/files" || (
		nvm_err "creating directory ${tmpdir}/files failed"
		return 3
	)
	local TARBALL
	TARBALL="${tmpdir}/${SLUG}.${COMPRESSION}" 
	local TARBALL_URL
	if nvm_version_greater_than_or_equal_to "${VERSION}" 0.1.14
	then
		TARBALL_URL="${MIRROR}/${VERSION}/${SLUG}.${COMPRESSION}" 
	else
		TARBALL_URL="${MIRROR}/${SLUG}.${COMPRESSION}" 
	fi
	if [ -r "${TARBALL}" ]
	then
		nvm_err "Local cache found: $(nvm_sanitize_path "${TARBALL}")"
		if nvm_compare_checksum "${TARBALL}" "${CHECKSUM}" > /dev/null 2>&1
		then
			nvm_err "Checksums match! Using existing downloaded archive $(nvm_sanitize_path "${TARBALL}")"
			nvm_echo "${TARBALL}"
			return 0
		fi
		nvm_compare_checksum "${TARBALL}" "${CHECKSUM}"
		nvm_err "Checksum check failed!"
		nvm_err "Removing the broken local cache..."
		command rm -rf "${TARBALL}"
	fi
	nvm_err "Downloading ${TARBALL_URL}..."
	nvm_download -L -C - "${PROGRESS_BAR}" "${TARBALL_URL}" -o "${TARBALL}" || (
		command rm -rf "${TARBALL}" "${tmpdir}"
		nvm_err "download from ${TARBALL_URL} failed"
		return 4
	)
	if nvm_grep '404 Not Found' "${TARBALL}" > /dev/null
	then
		command rm -rf "${TARBALL}" "${tmpdir}"
		nvm_err "HTTP 404 at URL ${TARBALL_URL}"
		return 5
	fi
	nvm_compare_checksum "${TARBALL}" "${CHECKSUM}" || (
		command rm -rf "${tmpdir}/files"
		return 6
	)
	nvm_echo "${TARBALL}"
}
nvm_echo () {
	command printf %s\\n "$*" 2> /dev/null
}
nvm_echo_with_colors () {
	command printf %b\\n "$*" 2> /dev/null
}
nvm_ensure_default_set () {
	local VERSION
	VERSION="$1" 
	if [ -z "${VERSION}" ]
	then
		nvm_err 'nvm_ensure_default_set: a version is required'
		return 1
	elif nvm_alias default > /dev/null 2>&1
	then
		return 0
	fi
	local OUTPUT
	OUTPUT="$(nvm alias default "${VERSION}")" 
	local EXIT_CODE
	EXIT_CODE="$?" 
	nvm_echo "Creating default alias: ${OUTPUT}"
	return $EXIT_CODE
}
nvm_ensure_version_installed () {
	local PROVIDED_VERSION
	PROVIDED_VERSION="${1-}" 
	local IS_VERSION_FROM_NVMRC
	IS_VERSION_FROM_NVMRC="${2-}" 
	if [ "${PROVIDED_VERSION}" = 'system' ]
	then
		if nvm_has_system_iojs || nvm_has_system_node
		then
			return 0
		fi
		nvm_err "N/A: no system version of node/io.js is installed."
		return 1
	fi
	local LOCAL_VERSION
	local EXIT_CODE
	LOCAL_VERSION="$(nvm_version "${PROVIDED_VERSION}")" 
	EXIT_CODE="$?" 
	local NVM_VERSION_DIR
	if [ "${EXIT_CODE}" != "0" ] || ! nvm_is_version_installed "${LOCAL_VERSION}"
	then
		if VERSION="$(nvm_resolve_alias "${PROVIDED_VERSION}")" 
		then
			nvm_err "N/A: version \"${PROVIDED_VERSION} -> ${VERSION}\" is not yet installed."
		else
			local PREFIXED_VERSION
			PREFIXED_VERSION="$(nvm_ensure_version_prefix "${PROVIDED_VERSION}")" 
			nvm_err "N/A: version \"${PREFIXED_VERSION:-$PROVIDED_VERSION}\" is not yet installed."
		fi
		nvm_err ""
		if [ "${PROVIDED_VERSION}" = 'lts' ]
		then
			nvm_err '`lts` is not an alias - you may need to run `nvm install --lts` to install and `nvm use --lts` to use it.'
		elif [ "${IS_VERSION_FROM_NVMRC}" != '1' ]
		then
			nvm_err "You need to run \`nvm install ${PROVIDED_VERSION}\` to install and use it."
		else
			nvm_err 'You need to run `nvm install` to install and use the node version specified in `.nvmrc`.'
		fi
		return 1
	fi
}
nvm_ensure_version_prefix () {
	local NVM_VERSION
	NVM_VERSION="$(nvm_strip_iojs_prefix "${1-}" | command sed -e 's/^\([0-9]\)/v\1/g')" 
	if nvm_is_iojs_version "${1-}"
	then
		nvm_add_iojs_prefix "${NVM_VERSION}"
	else
		nvm_echo "${NVM_VERSION}"
	fi
}
nvm_err () {
	nvm_echo "$@" >&2
}
nvm_err_with_colors () {
	nvm_echo_with_colors "$@" >&2
}
nvm_extract_tarball () {
	if [ "$#" -ne 4 ]
	then
		nvm_err 'nvm_extract_tarball requires exactly 4 arguments'
		return 5
	fi
	local NVM_OS
	NVM_OS="${1-}" 
	local VERSION
	VERSION="${2-}" 
	local TARBALL
	TARBALL="${3-}" 
	local TMPDIR
	TMPDIR="${4-}" 
	local tar_compression_flag
	tar_compression_flag='z' 
	if nvm_supports_xz "${VERSION}"
	then
		tar_compression_flag='J' 
	fi
	local tar
	tar='tar' 
	if [ "${NVM_OS}" = 'aix' ]
	then
		tar='gtar' 
	fi
	if [ "${NVM_OS}" = 'openbsd' ]
	then
		if [ "${tar_compression_flag}" = 'J' ]
		then
			command xzcat "${TARBALL}" | "${tar}" -xf - -C "${TMPDIR}" -s '/[^\/]*\///' || return 1
		else
			command "${tar}" -x${tar_compression_flag}f "${TARBALL}" -C "${TMPDIR}" -s '/[^\/]*\///' || return 1
		fi
	else
		command "${tar}" -x${tar_compression_flag}f "${TARBALL}" -C "${TMPDIR}" --strip-components 1 || return 1
	fi
}
nvm_find_nvmrc () {
	local dir
	dir="$(nvm_find_up '.nvmrc')" 
	if [ -e "${dir}/.nvmrc" ]
	then
		nvm_echo "${dir}/.nvmrc"
	fi
}
nvm_find_project_dir () {
	local path_
	path_="${PWD}" 
	while [ "${path_}" != "" ] && [ "${path_}" != '.' ] && [ ! -f "${path_}/package.json" ] && [ ! -d "${path_}/node_modules" ]
	do
		path_=${path_%/*} 
	done
	nvm_echo "${path_}"
}
nvm_find_up () {
	local path_
	path_="${PWD}" 
	while [ "${path_}" != "" ] && [ "${path_}" != '.' ] && [ ! -f "${path_}/${1-}" ]
	do
		path_=${path_%/*} 
	done
	nvm_echo "${path_}"
}
nvm_format_version () {
	local VERSION
	VERSION="$(nvm_ensure_version_prefix "${1-}")" 
	local NUM_GROUPS
	NUM_GROUPS="$(nvm_num_version_groups "${VERSION}")" 
	if [ "${NUM_GROUPS}" -lt 3 ]
	then
		nvm_format_version "${VERSION%.}.0"
	else
		nvm_echo "${VERSION}" | command cut -f1-3 -d.
	fi
}
nvm_get_arch () {
	local HOST_ARCH
	local NVM_OS
	local EXIT_CODE
	local LONG_BIT
	NVM_OS="$(nvm_get_os)" 
	if [ "_${NVM_OS}" = "_sunos" ]
	then
		if HOST_ARCH=$(pkg_info -Q MACHINE_ARCH pkg_install) 
		then
			HOST_ARCH=$(nvm_echo "${HOST_ARCH}" | command tail -1) 
		else
			HOST_ARCH=$(isainfo -n) 
		fi
	elif [ "_${NVM_OS}" = "_aix" ]
	then
		HOST_ARCH=ppc64 
	else
		HOST_ARCH="$(command uname -m)" 
		LONG_BIT="$(getconf LONG_BIT 2>/dev/null)" 
	fi
	local NVM_ARCH
	case "${HOST_ARCH}" in
		(x86_64 | amd64) NVM_ARCH="x64"  ;;
		(i*86) NVM_ARCH="x86"  ;;
		(aarch64 | armv8l) NVM_ARCH="arm64"  ;;
		(*) NVM_ARCH="${HOST_ARCH}"  ;;
	esac
	if [ "_${LONG_BIT}" = "_32" ] && [ "${NVM_ARCH}" = "x64" ]
	then
		NVM_ARCH="x86" 
	fi
	if [ "$(uname)" = "Linux" ] && [ "${NVM_ARCH}" = arm64 ] && [ "$(command od -An -t x1 -j 4 -N 1 "/sbin/init" 2>/dev/null)" = ' 01' ]
	then
		NVM_ARCH=armv7l 
		HOST_ARCH=armv7l 
	fi
	if [ -f "/etc/alpine-release" ]
	then
		NVM_ARCH=x64-musl 
	fi
	nvm_echo "${NVM_ARCH}"
}
nvm_get_artifact_compression () {
	local VERSION
	VERSION="${1-}" 
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	local COMPRESSION
	COMPRESSION='tar.gz' 
	if [ "_${NVM_OS}" = '_win' ]
	then
		COMPRESSION='zip' 
	elif nvm_supports_xz "${VERSION}"
	then
		COMPRESSION='tar.xz' 
	fi
	nvm_echo "${COMPRESSION}"
}
nvm_get_checksum () {
	local FLAVOR
	case "${1-}" in
		(node | iojs) FLAVOR="${1}"  ;;
		(*) nvm_err 'supported flavors: node, iojs'
			return 2 ;;
	esac
	local MIRROR
	MIRROR="$(nvm_get_mirror "${FLAVOR}" "${2-}")" 
	if [ -z "${MIRROR}" ]
	then
		return 1
	fi
	local SHASUMS_URL
	if [ "$(nvm_get_checksum_alg)" = 'sha-256' ]
	then
		SHASUMS_URL="${MIRROR}/${3}/SHASUMS256.txt" 
	else
		SHASUMS_URL="${MIRROR}/${3}/SHASUMS.txt" 
	fi
	nvm_download -L -s "${SHASUMS_URL}" -o - | command awk "{ if (\"${4}.${5}\" == \$2) print \$1}"
}
nvm_get_checksum_alg () {
	local NVM_CHECKSUM_BIN
	NVM_CHECKSUM_BIN="$(nvm_get_checksum_binary 2>/dev/null)" 
	case "${NVM_CHECKSUM_BIN-}" in
		(sha256sum | shasum | sha256 | gsha256sum | openssl | bssl) nvm_echo 'sha-256' ;;
		(sha1sum | sha1) nvm_echo 'sha-1' ;;
		(*) nvm_get_checksum_binary
			return $? ;;
	esac
}
nvm_get_checksum_binary () {
	if nvm_has_non_aliased 'sha256sum'
	then
		nvm_echo 'sha256sum'
	elif nvm_has_non_aliased 'shasum'
	then
		nvm_echo 'shasum'
	elif nvm_has_non_aliased 'sha256'
	then
		nvm_echo 'sha256'
	elif nvm_has_non_aliased 'gsha256sum'
	then
		nvm_echo 'gsha256sum'
	elif nvm_has_non_aliased 'openssl'
	then
		nvm_echo 'openssl'
	elif nvm_has_non_aliased 'bssl'
	then
		nvm_echo 'bssl'
	elif nvm_has_non_aliased 'sha1sum'
	then
		nvm_echo 'sha1sum'
	elif nvm_has_non_aliased 'sha1'
	then
		nvm_echo 'sha1'
	else
		nvm_err 'Unaliased sha256sum, shasum, sha256, gsha256sum, openssl, or bssl not found.'
		nvm_err 'Unaliased sha1sum or sha1 not found.'
		return 1
	fi
}
nvm_get_colors () {
	local COLOR
	local SYS_COLOR
	local COLORS
	COLORS="${NVM_COLORS:-bygre}" 
	case $1 in
		(1) COLOR=$(nvm_print_color_code "$(echo "$COLORS" | awk '{ print substr($0, 1, 1); }')")  ;;
		(2) COLOR=$(nvm_print_color_code "$(echo "$COLORS" | awk '{ print substr($0, 2, 1); }')")  ;;
		(3) COLOR=$(nvm_print_color_code "$(echo "$COLORS" | awk '{ print substr($0, 3, 1); }')")  ;;
		(4) COLOR=$(nvm_print_color_code "$(echo "$COLORS" | awk '{ print substr($0, 4, 1); }')")  ;;
		(5) COLOR=$(nvm_print_color_code "$(echo "$COLORS" | awk '{ print substr($0, 5, 1); }')")  ;;
		(6) SYS_COLOR=$(nvm_print_color_code "$(echo "$COLORS" | awk '{ print substr($0, 2, 1); }')") 
			COLOR=$(nvm_echo "$SYS_COLOR" | command tr '0;' '1;')  ;;
		(*) nvm_err "Invalid color index, ${1-}"
			return 1 ;;
	esac
	nvm_echo "$COLOR"
}
nvm_get_default_packages () {
	local NVM_DEFAULT_PACKAGE_FILE
	NVM_DEFAULT_PACKAGE_FILE="${NVM_DIR}/default-packages" 
	if [ -f "${NVM_DEFAULT_PACKAGE_FILE}" ]
	then
		command awk -v filename="${NVM_DEFAULT_PACKAGE_FILE}" '
      /^[[:space:]]*#/ { next }                     # Skip lines that begin with #
      /^[[:space:]]*$/ { next }                     # Skip empty lines
      /[[:space:]]/ && !/^[[:space:]]*#/ {
        print "Only one package per line is allowed in `" filename "`. Please remove any lines with multiple space-separated values." > "/dev/stderr"
        err = 1
        exit 1
      }
      {
        if (NR > 1 && !prev_space) printf " "
        printf "%s", $0
        prev_space = 0
      }
    ' "${NVM_DEFAULT_PACKAGE_FILE}"
	fi
}
nvm_get_download_slug () {
	local FLAVOR
	case "${1-}" in
		(node | iojs) FLAVOR="${1}"  ;;
		(*) nvm_err 'supported flavors: node, iojs'
			return 1 ;;
	esac
	local KIND
	case "${2-}" in
		(binary | source) KIND="${2}"  ;;
		(*) nvm_err 'supported kinds: binary, source'
			return 2 ;;
	esac
	local VERSION
	VERSION="${3-}" 
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	local NVM_ARCH
	NVM_ARCH="$(nvm_get_arch)" 
	if ! nvm_is_merged_node_version "${VERSION}"
	then
		if [ "${NVM_ARCH}" = 'armv6l' ] || [ "${NVM_ARCH}" = 'armv7l' ]
		then
			NVM_ARCH="arm-pi" 
		fi
	fi
	if nvm_version_greater '14.17.0' "${VERSION}" || (
			nvm_version_greater_than_or_equal_to "${VERSION}" '15.0.0' && nvm_version_greater '16.0.0' "${VERSION}"
		)
	then
		if [ "_${NVM_OS}" = '_darwin' ] && [ "${NVM_ARCH}" = 'arm64' ]
		then
			NVM_ARCH=x64 
		fi
	fi
	if [ "${KIND}" = 'binary' ]
	then
		nvm_echo "${FLAVOR}-${VERSION}-${NVM_OS}-${NVM_ARCH}"
	elif [ "${KIND}" = 'source' ]
	then
		nvm_echo "${FLAVOR}-${VERSION}"
	fi
}
nvm_get_latest () {
	local NVM_LATEST_URL
	local CURL_COMPRESSED_FLAG
	if nvm_has "curl"
	then
		if nvm_curl_use_compression
		then
			CURL_COMPRESSED_FLAG="--compressed" 
		fi
		NVM_LATEST_URL="$(curl ${CURL_COMPRESSED_FLAG:-} -q -w "%{url_effective}\\n" -L -s -S https://latest.nvm.sh -o /dev/null)" 
	elif nvm_has "wget"
	then
		NVM_LATEST_URL="$(wget -q https://latest.nvm.sh --server-response -O /dev/null 2>&1 | command awk '/^  Location: /{DEST=$2} END{ print DEST }')" 
	else
		nvm_err 'nvm needs curl or wget to proceed.'
		return 1
	fi
	if [ -z "${NVM_LATEST_URL}" ]
	then
		nvm_err "https://latest.nvm.sh did not redirect to the latest release on GitHub"
		return 2
	fi
	nvm_echo "${NVM_LATEST_URL##*/}"
}
nvm_get_make_jobs () {
	if nvm_is_natural_num "${1-}"
	then
		NVM_MAKE_JOBS="$1" 
		nvm_echo "number of \`make\` jobs: ${NVM_MAKE_JOBS}"
		return
	elif [ -n "${1-}" ]
	then
		unset NVM_MAKE_JOBS
		nvm_err "$1 is invalid for number of \`make\` jobs, must be a natural number"
	fi
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	local NVM_CPU_CORES
	case "_${NVM_OS}" in
		("_linux") NVM_CPU_CORES="$(nvm_grep -c -E '^processor.+: [0-9]+' /proc/cpuinfo)"  ;;
		("_freebsd" | "_darwin" | "_openbsd") NVM_CPU_CORES="$(sysctl -n hw.ncpu)"  ;;
		("_sunos") NVM_CPU_CORES="$(psrinfo | wc -l)"  ;;
		("_aix") NVM_CPU_CORES="$(pmcycles -m | wc -l)"  ;;
	esac
	if ! nvm_is_natural_num "${NVM_CPU_CORES}"
	then
		nvm_err 'Can not determine how many core(s) are available, running in single-threaded mode.'
		nvm_err 'Please report an issue on GitHub to help us make nvm run faster on your computer!'
		NVM_MAKE_JOBS=1 
	else
		nvm_echo "Detected that you have ${NVM_CPU_CORES} CPU core(s)"
		if [ "${NVM_CPU_CORES}" -gt 2 ]
		then
			NVM_MAKE_JOBS=$((NVM_CPU_CORES - 1)) 
			nvm_echo "Running with ${NVM_MAKE_JOBS} threads to speed up the build"
		else
			NVM_MAKE_JOBS=1 
			nvm_echo 'Number of CPU core(s) less than or equal to 2, running in single-threaded mode'
		fi
	fi
}
nvm_get_minor_version () {
	local VERSION
	VERSION="$1" 
	if [ -z "${VERSION}" ]
	then
		nvm_err 'a version is required'
		return 1
	fi
	case "${VERSION}" in
		(v | .* | *..* | v*[!.0123456789]* | [!v]*[!.0123456789]* | [!v0123456789]* | v[!0123456789]*) nvm_err 'invalid version number'
			return 2 ;;
	esac
	local PREFIXED_VERSION
	PREFIXED_VERSION="$(nvm_format_version "${VERSION}")" 
	local MINOR
	MINOR="$(nvm_echo "${PREFIXED_VERSION}" | nvm_grep -e '^v' | command cut -c2- | command cut -d . -f 1,2)" 
	if [ -z "${MINOR}" ]
	then
		nvm_err 'invalid version number! (please report this)'
		return 3
	fi
	nvm_echo "${MINOR}"
}
nvm_get_mirror () {
	local NVM_MIRROR
	NVM_MIRROR='' 
	case "${1}-${2}" in
		(node-std) NVM_MIRROR="${NVM_NODEJS_ORG_MIRROR:-https://nodejs.org/dist}"  ;;
		(iojs-std) NVM_MIRROR="${NVM_IOJS_ORG_MIRROR:-https://iojs.org/dist}"  ;;
		(*) nvm_err 'unknown type of node.js or io.js release'
			return 1 ;;
	esac
	case "${NVM_MIRROR}" in
		(*\`* | *\\* | *\'* | *\(* | *' '*) nvm_err '$NVM_NODEJS_ORG_MIRROR and $NVM_IOJS_ORG_MIRROR may only contain a URL'
			return 2 ;;
	esac
	if ! nvm_echo "${NVM_MIRROR}" | command awk '{ $0 ~ "^https?://[a-zA-Z0-9./_-]+$" }'
	then
		nvm_err '$NVM_NODEJS_ORG_MIRROR and $NVM_IOJS_ORG_MIRROR may only contain a URL'
		return 2
	fi
	nvm_echo "${NVM_MIRROR}"
}
nvm_get_os () {
	local NVM_UNAME
	NVM_UNAME="$(command uname -a)" 
	local NVM_OS
	case "${NVM_UNAME}" in
		(Linux\ *) NVM_OS=linux  ;;
		(Darwin\ *) NVM_OS=darwin  ;;
		(SunOS\ *) NVM_OS=sunos  ;;
		(FreeBSD\ *) NVM_OS=freebsd  ;;
		(OpenBSD\ *) NVM_OS=openbsd  ;;
		(AIX\ *) NVM_OS=aix  ;;
		(CYGWIN* | MSYS* | MINGW*) NVM_OS=win  ;;
	esac
	nvm_echo "${NVM_OS-}"
}
nvm_grep () {
	GREP_OPTIONS='' command grep "$@"
}
nvm_has () {
	type "${1-}" > /dev/null 2>&1
}
nvm_has_colors () {
	local NVM_NUM_COLORS
	if nvm_has tput
	then
		NVM_NUM_COLORS="$(command tput -T "${TERM:-vt100}" colors)" 
	fi
	[ "${NVM_NUM_COLORS:--1}" -ge 8 ] && [ "${NVM_NO_COLORS-}" != '--no-colors' ]
}
nvm_has_non_aliased () {
	nvm_has "${1-}" && ! nvm_is_alias "${1-}"
}
nvm_has_solaris_binary () {
	local VERSION="${1-}" 
	if nvm_is_merged_node_version "${VERSION}"
	then
		return 0
	elif nvm_is_iojs_version "${VERSION}"
	then
		nvm_iojs_version_has_solaris_binary "${VERSION}"
	else
		nvm_node_version_has_solaris_binary "${VERSION}"
	fi
}
nvm_has_system_iojs () {
	[ "$(nvm deactivate >/dev/null 2>&1 && command -v iojs)" != '' ]
}
nvm_has_system_node () {
	[ "$(nvm deactivate >/dev/null 2>&1 && command -v node)" != '' ]
}
nvm_install_binary () {
	local FLAVOR
	case "${1-}" in
		(node | iojs) FLAVOR="${1}"  ;;
		(*) nvm_err 'supported flavors: node, iojs'
			return 4 ;;
	esac
	local TYPE
	TYPE="${2-}" 
	local PREFIXED_VERSION
	PREFIXED_VERSION="${3-}" 
	if [ -z "${PREFIXED_VERSION}" ]
	then
		nvm_err 'A version number is required.'
		return 3
	fi
	local nosource
	nosource="${4-}" 
	local VERSION
	VERSION="$(nvm_strip_iojs_prefix "${PREFIXED_VERSION}")" 
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	if [ -z "${NVM_OS}" ]
	then
		return 2
	fi
	local TARBALL
	local TMPDIR
	local PROGRESS_BAR
	local NODE_OR_IOJS
	if [ "${FLAVOR}" = 'node' ]
	then
		NODE_OR_IOJS="${FLAVOR}" 
	elif [ "${FLAVOR}" = 'iojs' ]
	then
		NODE_OR_IOJS="io.js" 
	fi
	if [ "${NVM_NO_PROGRESS-}" = "1" ]
	then
		PROGRESS_BAR="-sS" 
	else
		PROGRESS_BAR="--progress-bar" 
	fi
	nvm_echo "Downloading and installing ${NODE_OR_IOJS-} ${VERSION}..."
	TARBALL="$(PROGRESS_BAR="${PROGRESS_BAR}" nvm_download_artifact "${FLAVOR}" binary "${TYPE-}" "${VERSION}" | command tail -1)" 
	if [ -f "${TARBALL}" ]
	then
		TMPDIR="$(dirname "${TARBALL}")/files" 
	fi
	if nvm_install_binary_extract "${NVM_OS}" "${PREFIXED_VERSION}" "${VERSION}" "${TARBALL}" "${TMPDIR}"
	then
		if [ -n "${ALIAS-}" ]
		then
			nvm alias "${ALIAS}" "${provided_version}"
		fi
		return 0
	fi
	if [ "${nosource-}" = '1' ]
	then
		nvm_err 'Binary download failed. Download from source aborted.'
		return 0
	fi
	nvm_err 'Binary download failed, trying source.'
	if [ -n "${TMPDIR-}" ]
	then
		command rm -rf "${TMPDIR}"
	fi
	return 1
}
nvm_install_binary_extract () {
	if [ "$#" -ne 5 ]
	then
		nvm_err 'nvm_install_binary_extract needs 5 parameters'
		return 1
	fi
	local NVM_OS
	local PREFIXED_VERSION
	local VERSION
	local TARBALL
	local TMPDIR
	NVM_OS="${1}" 
	PREFIXED_VERSION="${2}" 
	VERSION="${3}" 
	TARBALL="${4}" 
	TMPDIR="${5}" 
	local VERSION_PATH
	[ -n "${TMPDIR-}" ] && command mkdir -p "${TMPDIR}" && VERSION_PATH="$(nvm_version_path "${PREFIXED_VERSION}")"  || return 1
	if [ "${NVM_OS}" = 'win' ]
	then
		VERSION_PATH="${VERSION_PATH}/bin" 
		command unzip -q "${TARBALL}" -d "${TMPDIR}" || return 1
	else
		nvm_extract_tarball "${NVM_OS}" "${VERSION}" "${TARBALL}" "${TMPDIR}"
	fi
	command mkdir -p "${VERSION_PATH}" || return 1
	if [ "${NVM_OS}" = 'win' ]
	then
		command mv "${TMPDIR}/"*/* "${VERSION_PATH}/" || return 1
		command chmod +x "${VERSION_PATH}"/node.exe || return 1
		command chmod +x "${VERSION_PATH}"/npm || return 1
		command chmod +x "${VERSION_PATH}"/npx 2> /dev/null
	else
		command mv "${TMPDIR}/"* "${VERSION_PATH}" || return 1
	fi
	command rm -rf "${TMPDIR}"
	return 0
}
nvm_install_default_packages () {
	local DEFAULT_PACKAGES
	DEFAULT_PACKAGES="$(nvm_get_default_packages)" 
	EXIT_CODE=$? 
	if [ $EXIT_CODE -ne 0 ] || [ -z "${DEFAULT_PACKAGES}" ]
	then
		return $EXIT_CODE
	fi
	nvm_echo "Installing default global packages from ${NVM_DIR}/default-packages..."
	nvm_echo "npm install -g --quiet ${DEFAULT_PACKAGES}"
	if ! nvm_echo "${DEFAULT_PACKAGES}" | command xargs npm install -g --quiet
	then
		nvm_err "Failed installing default packages. Please check if your default-packages file or a package in it has problems!"
		return 1
	fi
}
nvm_install_latest_npm () {
	nvm_echo 'Attempting to upgrade to the latest working version of npm...'
	local NODE_VERSION
	NODE_VERSION="$(nvm_strip_iojs_prefix "$(nvm_ls_current)")" 
	local NPM_VERSION
	NPM_VERSION="$(npm --version 2>/dev/null)" 
	if [ "${NODE_VERSION}" = 'system' ]
	then
		NODE_VERSION="$(node --version)" 
	elif [ "${NODE_VERSION}" = 'none' ]
	then
		nvm_echo "Detected node version ${NODE_VERSION}, npm version v${NPM_VERSION}"
		NODE_VERSION='' 
	fi
	if [ -z "${NODE_VERSION}" ]
	then
		nvm_err 'Unable to obtain node version.'
		return 1
	fi
	if [ -z "${NPM_VERSION}" ]
	then
		nvm_err 'Unable to obtain npm version.'
		return 2
	fi
	local NVM_NPM_CMD
	NVM_NPM_CMD='npm' 
	if [ "${NVM_DEBUG-}" = 1 ]
	then
		nvm_echo "Detected node version ${NODE_VERSION}, npm version v${NPM_VERSION}"
		NVM_NPM_CMD='nvm_echo npm' 
	fi
	local NVM_IS_0_6
	NVM_IS_0_6=0 
	if nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 0.6.0 && nvm_version_greater 0.7.0 "${NODE_VERSION}"
	then
		NVM_IS_0_6=1 
	fi
	local NVM_IS_0_9
	NVM_IS_0_9=0 
	if nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 0.9.0 && nvm_version_greater 0.10.0 "${NODE_VERSION}"
	then
		NVM_IS_0_9=1 
	fi
	if [ $NVM_IS_0_6 -eq 1 ]
	then
		nvm_echo '* `node` v0.6.x can only upgrade to `npm` v1.3.x'
		$NVM_NPM_CMD install -g npm@1.3
	elif [ $NVM_IS_0_9 -eq 0 ]
	then
		if nvm_version_greater_than_or_equal_to "${NPM_VERSION}" 1.0.0 && nvm_version_greater 2.0.0 "${NPM_VERSION}"
		then
			nvm_echo '* `npm` v1.x needs to first jump to `npm` v1.4.28 to be able to upgrade further'
			$NVM_NPM_CMD install -g npm@1.4.28
		elif nvm_version_greater_than_or_equal_to "${NPM_VERSION}" 2.0.0 && nvm_version_greater 3.0.0 "${NPM_VERSION}"
		then
			nvm_echo '* `npm` v2.x needs to first jump to the latest v2 to be able to upgrade further'
			$NVM_NPM_CMD install -g npm@2
		fi
	fi
	if [ $NVM_IS_0_9 -eq 1 ] || [ $NVM_IS_0_6 -eq 1 ]
	then
		nvm_echo '* node v0.6 and v0.9 are unable to upgrade further'
	elif nvm_version_greater 1.1.0 "${NODE_VERSION}"
	then
		nvm_echo '* `npm` v4.5.x is the last version that works on `node` versions < v1.1.0'
		$NVM_NPM_CMD install -g npm@4.5
	elif nvm_version_greater 4.0.0 "${NODE_VERSION}"
	then
		nvm_echo '* `npm` v5 and higher do not work on `node` versions below v4.0.0'
		$NVM_NPM_CMD install -g npm@4
	elif [ $NVM_IS_0_9 -eq 0 ] && [ $NVM_IS_0_6 -eq 0 ]
	then
		local NVM_IS_4_4_OR_BELOW
		NVM_IS_4_4_OR_BELOW=0 
		if nvm_version_greater 4.5.0 "${NODE_VERSION}"
		then
			NVM_IS_4_4_OR_BELOW=1 
		fi
		local NVM_IS_5_OR_ABOVE
		NVM_IS_5_OR_ABOVE=0 
		if [ $NVM_IS_4_4_OR_BELOW -eq 0 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 5.0.0
		then
			NVM_IS_5_OR_ABOVE=1 
		fi
		local NVM_IS_6_OR_ABOVE
		NVM_IS_6_OR_ABOVE=0 
		local NVM_IS_6_2_OR_ABOVE
		NVM_IS_6_2_OR_ABOVE=0 
		if [ $NVM_IS_5_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 6.0.0
		then
			NVM_IS_6_OR_ABOVE=1 
			if nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 6.2.0
			then
				NVM_IS_6_2_OR_ABOVE=1 
			fi
		fi
		local NVM_IS_9_OR_ABOVE
		NVM_IS_9_OR_ABOVE=0 
		local NVM_IS_9_3_OR_ABOVE
		NVM_IS_9_3_OR_ABOVE=0 
		if [ $NVM_IS_6_2_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 9.0.0
		then
			NVM_IS_9_OR_ABOVE=1 
			if nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 9.3.0
			then
				NVM_IS_9_3_OR_ABOVE=1 
			fi
		fi
		local NVM_IS_10_OR_ABOVE
		NVM_IS_10_OR_ABOVE=0 
		if [ $NVM_IS_9_3_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 10.0.0
		then
			NVM_IS_10_OR_ABOVE=1 
		fi
		local NVM_IS_12_LTS_OR_ABOVE
		NVM_IS_12_LTS_OR_ABOVE=0 
		if [ $NVM_IS_10_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 12.13.0
		then
			NVM_IS_12_LTS_OR_ABOVE=1 
		fi
		local NVM_IS_13_OR_ABOVE
		NVM_IS_13_OR_ABOVE=0 
		if [ $NVM_IS_12_LTS_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 13.0.0
		then
			NVM_IS_13_OR_ABOVE=1 
		fi
		local NVM_IS_14_LTS_OR_ABOVE
		NVM_IS_14_LTS_OR_ABOVE=0 
		if [ $NVM_IS_13_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 14.15.0
		then
			NVM_IS_14_LTS_OR_ABOVE=1 
		fi
		local NVM_IS_14_17_OR_ABOVE
		NVM_IS_14_17_OR_ABOVE=0 
		if [ $NVM_IS_14_LTS_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 14.17.0
		then
			NVM_IS_14_17_OR_ABOVE=1 
		fi
		local NVM_IS_15_OR_ABOVE
		NVM_IS_15_OR_ABOVE=0 
		if [ $NVM_IS_14_LTS_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 15.0.0
		then
			NVM_IS_15_OR_ABOVE=1 
		fi
		local NVM_IS_16_OR_ABOVE
		NVM_IS_16_OR_ABOVE=0 
		if [ $NVM_IS_15_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 16.0.0
		then
			NVM_IS_16_OR_ABOVE=1 
		fi
		local NVM_IS_16_LTS_OR_ABOVE
		NVM_IS_16_LTS_OR_ABOVE=0 
		if [ $NVM_IS_16_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 16.13.0
		then
			NVM_IS_16_LTS_OR_ABOVE=1 
		fi
		local NVM_IS_17_OR_ABOVE
		NVM_IS_17_OR_ABOVE=0 
		if [ $NVM_IS_16_LTS_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 17.0.0
		then
			NVM_IS_17_OR_ABOVE=1 
		fi
		local NVM_IS_18_OR_ABOVE
		NVM_IS_18_OR_ABOVE=0 
		if [ $NVM_IS_17_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 18.0.0
		then
			NVM_IS_18_OR_ABOVE=1 
		fi
		local NVM_IS_18_17_OR_ABOVE
		NVM_IS_18_17_OR_ABOVE=0 
		if [ $NVM_IS_18_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 18.17.0
		then
			NVM_IS_18_17_OR_ABOVE=1 
		fi
		local NVM_IS_19_OR_ABOVE
		NVM_IS_19_OR_ABOVE=0 
		if [ $NVM_IS_18_17_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 19.0.0
		then
			NVM_IS_19_OR_ABOVE=1 
		fi
		local NVM_IS_20_5_OR_ABOVE
		NVM_IS_20_5_OR_ABOVE=0 
		if [ $NVM_IS_19_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 20.5.0
		then
			NVM_IS_20_5_OR_ABOVE=1 
		fi
		local NVM_IS_20_17_OR_ABOVE
		NVM_IS_20_17_OR_ABOVE=0 
		if [ $NVM_IS_20_5_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 20.17.0
		then
			NVM_IS_20_17_OR_ABOVE=1 
		fi
		local NVM_IS_21_OR_ABOVE
		NVM_IS_21_OR_ABOVE=0 
		if [ $NVM_IS_20_17_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 21.0.0
		then
			NVM_IS_21_OR_ABOVE=1 
		fi
		local NVM_IS_22_9_OR_ABOVE
		NVM_IS_22_9_OR_ABOVE=0 
		if [ $NVM_IS_21_OR_ABOVE -eq 1 ] && nvm_version_greater_than_or_equal_to "${NODE_VERSION}" 22.9.0
		then
			NVM_IS_22_9_OR_ABOVE=1 
		fi
		if [ $NVM_IS_4_4_OR_BELOW -eq 1 ] || {
				[ $NVM_IS_5_OR_ABOVE -eq 1 ] && nvm_version_greater 5.10.0 "${NODE_VERSION}"
			}
		then
			nvm_echo '* `npm` `v5.3.x` is the last version that works on `node` 4.x versions below v4.4, or 5.x versions below v5.10, due to `Buffer.alloc`'
			$NVM_NPM_CMD install -g npm@5.3
		elif [ $NVM_IS_4_4_OR_BELOW -eq 0 ] && nvm_version_greater 4.7.0 "${NODE_VERSION}"
		then
			nvm_echo '* `npm` `v5.4.1` is the last version that works on `node` `v4.5` and `v4.6`'
			$NVM_NPM_CMD install -g npm@5.4.1
		elif [ $NVM_IS_6_OR_ABOVE -eq 0 ]
		then
			nvm_echo '* `npm` `v5.x` is the last version that works on `node` below `v6.0.0`'
			$NVM_NPM_CMD install -g npm@5
		elif {
				[ $NVM_IS_6_OR_ABOVE -eq 1 ] && [ $NVM_IS_6_2_OR_ABOVE -eq 0 ]
			} || {
				[ $NVM_IS_9_OR_ABOVE -eq 1 ] && [ $NVM_IS_9_3_OR_ABOVE -eq 0 ]
			}
		then
			nvm_echo '* `npm` `v6.9` is the last version that works on `node` `v6.0.x`, `v6.1.x`, `v9.0.x`, `v9.1.x`, or `v9.2.x`'
			$NVM_NPM_CMD install -g npm@6.9
		elif [ $NVM_IS_10_OR_ABOVE -eq 0 ]
		then
			if nvm_version_greater 4.4.4 "${NPM_VERSION}"
			then
				nvm_echo '* `npm` `v4.4.4` or later is required to install npm v6.14.18'
				$NVM_NPM_CMD install -g npm@4
			fi
			nvm_echo '* `npm` `v6.x` is the last version that works on `node` below `v10.0.0`'
			$NVM_NPM_CMD install -g npm@6
		elif [ $NVM_IS_12_LTS_OR_ABOVE -eq 0 ] || {
				[ $NVM_IS_13_OR_ABOVE -eq 1 ] && [ $NVM_IS_14_LTS_OR_ABOVE -eq 0 ]
			} || {
				[ $NVM_IS_15_OR_ABOVE -eq 1 ] && [ $NVM_IS_16_OR_ABOVE -eq 0 ]
			}
		then
			nvm_echo '* `npm` `v7.x` is the last version that works on `node` `v13`, `v15`, below `v12.13`, or `v14.0` - `v14.15`'
			$NVM_NPM_CMD install -g npm@7
		elif {
				[ $NVM_IS_12_LTS_OR_ABOVE -eq 1 ] && [ $NVM_IS_13_OR_ABOVE -eq 0 ]
			} || {
				[ $NVM_IS_14_LTS_OR_ABOVE -eq 1 ] && [ $NVM_IS_14_17_OR_ABOVE -eq 0 ]
			} || {
				[ $NVM_IS_16_OR_ABOVE -eq 1 ] && [ $NVM_IS_16_LTS_OR_ABOVE -eq 0 ]
			} || {
				[ $NVM_IS_17_OR_ABOVE -eq 1 ] && [ $NVM_IS_18_OR_ABOVE -eq 0 ]
			}
		then
			nvm_echo '* `npm` `v8.6` is the last version that works on `node` `v12`, `v14.13` - `v14.16`, or `v16.0` - `v16.12`'
			$NVM_NPM_CMD install -g npm@8.6
		elif [ $NVM_IS_18_17_OR_ABOVE -eq 0 ] || {
				[ $NVM_IS_19_OR_ABOVE -eq 1 ] && [ $NVM_IS_20_5_OR_ABOVE -eq 0 ]
			}
		then
			nvm_echo '* `npm` `v9.x` is the last version that works on `node` `< v18.17`, `v19`, or `v20.0` - `v20.4`'
			$NVM_NPM_CMD install -g npm@9
		elif [ $NVM_IS_20_17_OR_ABOVE -eq 0 ] || {
				[ $NVM_IS_21_OR_ABOVE -eq 1 ] && [ $NVM_IS_22_9_OR_ABOVE -eq 0 ]
			}
		then
			nvm_echo '* `npm` `v10.x` is the last version that works on `node` `< v20.17`, `v21`, or `v22.0` - `v22.8`'
			$NVM_NPM_CMD install -g npm@10
		else
			nvm_echo '* Installing latest `npm`; if this does not work on your node version, please report a bug!'
			$NVM_NPM_CMD install -g npm
		fi
	fi
	nvm_echo "* npm upgraded to: v$(npm --version 2>/dev/null)"
}
nvm_install_npm_if_needed () {
	local VERSION
	VERSION="$(nvm_ls_current)" 
	if ! nvm_has "npm"
	then
		nvm_echo 'Installing npm...'
		if nvm_version_greater 0.2.0 "${VERSION}"
		then
			nvm_err 'npm requires node v0.2.3 or higher'
		elif nvm_version_greater_than_or_equal_to "${VERSION}" 0.2.0
		then
			if nvm_version_greater 0.2.3 "${VERSION}"
			then
				nvm_err 'npm requires node v0.2.3 or higher'
			else
				nvm_download -L https://npmjs.org/install.sh -o - | clean=yes npm_install=0.2.19 sh
			fi
		else
			nvm_download -L https://npmjs.org/install.sh -o - | clean=yes sh
		fi
	fi
	return $?
}
nvm_install_source () {
	local FLAVOR
	case "${1-}" in
		(node | iojs) FLAVOR="${1}"  ;;
		(*) nvm_err 'supported flavors: node, iojs'
			return 4 ;;
	esac
	local TYPE
	TYPE="${2-}" 
	local PREFIXED_VERSION
	PREFIXED_VERSION="${3-}" 
	if [ -z "${PREFIXED_VERSION}" ]
	then
		nvm_err 'A version number is required.'
		return 3
	fi
	local VERSION
	VERSION="$(nvm_strip_iojs_prefix "${PREFIXED_VERSION}")" 
	local NVM_MAKE_JOBS
	NVM_MAKE_JOBS="${4-}" 
	local ADDITIONAL_PARAMETERS
	ADDITIONAL_PARAMETERS="${5-}" 
	local NVM_ARCH
	NVM_ARCH="$(nvm_get_arch)" 
	if [ "${NVM_ARCH}" = 'armv6l' ] || [ "${NVM_ARCH}" = 'armv7l' ]
	then
		if [ -n "${ADDITIONAL_PARAMETERS}" ]
		then
			ADDITIONAL_PARAMETERS="--without-snapshot ${ADDITIONAL_PARAMETERS}" 
		else
			ADDITIONAL_PARAMETERS='--without-snapshot' 
		fi
	fi
	if [ -n "${ADDITIONAL_PARAMETERS}" ]
	then
		nvm_echo "Additional options while compiling: ${ADDITIONAL_PARAMETERS}"
	fi
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	local make
	make='make' 
	local MAKE_CXX
	case "${NVM_OS}" in
		('freebsd' | 'openbsd') make='gmake' 
			MAKE_CXX="CC=${CC:-cc} CXX=${CXX:-c++}"  ;;
		('darwin') MAKE_CXX="CC=${CC:-cc} CXX=${CXX:-c++}"  ;;
		('aix') make='gmake'  ;;
	esac
	if nvm_has "clang++" && nvm_has "clang" && nvm_version_greater_than_or_equal_to "$(nvm_clang_version)" 3.5
	then
		if [ -z "${CC-}" ] || [ -z "${CXX-}" ]
		then
			nvm_echo "Clang v3.5+ detected! CC or CXX not specified, will use Clang as C/C++ compiler!"
			MAKE_CXX="CC=${CC:-cc} CXX=${CXX:-c++}" 
		fi
	fi
	local TARBALL
	local TMPDIR
	local VERSION_PATH
	if [ "${NVM_NO_PROGRESS-}" = "1" ]
	then
		PROGRESS_BAR="-sS" 
	else
		PROGRESS_BAR="--progress-bar" 
	fi
	nvm_is_zsh && setopt local_options shwordsplit
	TARBALL="$(PROGRESS_BAR="${PROGRESS_BAR}" nvm_download_artifact "${FLAVOR}" source "${TYPE}" "${VERSION}" | command tail -1)"  && [ -f "${TARBALL}" ] && TMPDIR="$(dirname "${TARBALL}")/files"  && if ! (
			command mkdir -p "${TMPDIR}" && nvm_extract_tarball "${NVM_OS}" "${VERSION}" "${TARBALL}" "${TMPDIR}" && VERSION_PATH="$(nvm_version_path "${PREFIXED_VERSION}")"  && nvm_cd "${TMPDIR}" && nvm_echo '$>'./configure --prefix="${VERSION_PATH}" $ADDITIONAL_PARAMETERS'<' && ./configure --prefix="${VERSION_PATH}" $ADDITIONAL_PARAMETERS && $make -j "${NVM_MAKE_JOBS}" ${MAKE_CXX-} && command rm -f "${VERSION_PATH}" 2> /dev/null && $make -j "${NVM_MAKE_JOBS}" ${MAKE_CXX-} install
		)
	then
		nvm_err "nvm: install ${VERSION} failed!"
		command rm -rf "${TMPDIR-}"
		return 1
	fi
}
nvm_iojs_prefix () {
	nvm_echo 'iojs'
}
nvm_iojs_version_has_solaris_binary () {
	local IOJS_VERSION
	IOJS_VERSION="$1" 
	local STRIPPED_IOJS_VERSION
	STRIPPED_IOJS_VERSION="$(nvm_strip_iojs_prefix "${IOJS_VERSION}")" 
	if [ "_${STRIPPED_IOJS_VERSION}" = "${IOJS_VERSION}" ]
	then
		return 1
	fi
	nvm_version_greater_than_or_equal_to "${STRIPPED_IOJS_VERSION}" v3.3.1
}
nvm_is_alias () {
	\alias "${1-}" > /dev/null 2>&1
}
nvm_is_iojs_version () {
	case "${1-}" in
		(iojs-*) return 0 ;;
	esac
	return 1
}
nvm_is_merged_node_version () {
	nvm_version_greater_than_or_equal_to "$1" v4.0.0
}
nvm_is_natural_num () {
	if [ -z "$1" ]
	then
		return 4
	fi
	case "$1" in
		(0) return 1 ;;
		(-*) return 3 ;;
		(*) [ "$1" -eq "$1" ] 2> /dev/null ;;
	esac
}
nvm_is_valid_version () {
	if nvm_validate_implicit_alias "${1-}" 2> /dev/null
	then
		return 0
	fi
	case "${1-}" in
		("$(nvm_iojs_prefix)" | "$(nvm_node_prefix)") return 0 ;;
		(*) local VERSION
			VERSION="$(nvm_strip_iojs_prefix "${1-}")" 
			nvm_version_greater_than_or_equal_to "${VERSION}" 0 ;;
	esac
}
nvm_is_version_installed () {
	if [ -z "${1-}" ]
	then
		return 1
	fi
	local NVM_NODE_BINARY
	NVM_NODE_BINARY='node' 
	if [ "_$(nvm_get_os)" = '_win' ]
	then
		NVM_NODE_BINARY='node.exe' 
	fi
	if [ -x "$(nvm_version_path "$1" 2>/dev/null)/bin/${NVM_NODE_BINARY}" ]
	then
		return 0
	fi
	return 1
}
nvm_is_zsh () {
	[ -n "${ZSH_VERSION-}" ]
}
nvm_list_aliases () {
	local ALIAS
	ALIAS="${1-}" 
	local NVM_CURRENT
	NVM_CURRENT="$(nvm_ls_current)" 
	local NVM_ALIAS_DIR
	NVM_ALIAS_DIR="$(nvm_alias_path)" 
	command mkdir -p "${NVM_ALIAS_DIR}/lts"
	if [ "${ALIAS}" != "${ALIAS#lts/}" ]
	then
		nvm_alias "${ALIAS}"
		return $?
	fi
	nvm_is_zsh && unsetopt local_options nomatch
	(
		local ALIAS_PATH
		for ALIAS_PATH in "${NVM_ALIAS_DIR}/${ALIAS}"*
		do
			NVM_NO_COLORS="${NVM_NO_COLORS-}" NVM_CURRENT="${NVM_CURRENT}" nvm_print_alias_path "${NVM_ALIAS_DIR}" "${ALIAS_PATH}" &
		done
		wait
	) | command sort
	(
		local ALIAS_NAME
		for ALIAS_NAME in "$(nvm_node_prefix)" "stable" "unstable" "$(nvm_iojs_prefix)"
		do
			{
				if [ ! -f "${NVM_ALIAS_DIR}/${ALIAS_NAME}" ] && {
						[ -z "${ALIAS}" ] || [ "${ALIAS_NAME}" = "${ALIAS}" ]
					}
				then
					NVM_NO_COLORS="${NVM_NO_COLORS-}" NVM_CURRENT="${NVM_CURRENT}" nvm_print_default_alias "${ALIAS_NAME}"
				fi
			} &
		done
		wait
	) | command sort
	(
		local LTS_ALIAS
		for ALIAS_PATH in "${NVM_ALIAS_DIR}/lts/${ALIAS}"*
		do
			{
				LTS_ALIAS="$(NVM_NO_COLORS="${NVM_NO_COLORS-}" NVM_LTS=true nvm_print_alias_path "${NVM_ALIAS_DIR}" "${ALIAS_PATH}")" 
				if [ -n "${LTS_ALIAS}" ]
				then
					nvm_echo "${LTS_ALIAS}"
				fi
			} &
		done
		wait
	) | command sort
	return
}
nvm_ls () {
	local PATTERN
	PATTERN="${1-}" 
	local VERSIONS
	VERSIONS='' 
	if [ "${PATTERN}" = 'current' ]
	then
		nvm_ls_current
		return
	fi
	local NVM_IOJS_PREFIX
	NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
	local NVM_NODE_PREFIX
	NVM_NODE_PREFIX="$(nvm_node_prefix)" 
	local NVM_VERSION_DIR_IOJS
	NVM_VERSION_DIR_IOJS="$(nvm_version_dir "${NVM_IOJS_PREFIX}")" 
	local NVM_VERSION_DIR_NEW
	NVM_VERSION_DIR_NEW="$(nvm_version_dir new)" 
	local NVM_VERSION_DIR_OLD
	NVM_VERSION_DIR_OLD="$(nvm_version_dir old)" 
	case "${PATTERN}" in
		("${NVM_IOJS_PREFIX}" | "${NVM_NODE_PREFIX}") PATTERN="${PATTERN}-"  ;;
		(*) if nvm_resolve_local_alias "${PATTERN}"
			then
				return
			fi
			PATTERN="$(nvm_ensure_version_prefix "${PATTERN}")"  ;;
	esac
	if [ "${PATTERN}" = 'N/A' ]
	then
		return
	fi
	local NVM_PATTERN_STARTS_WITH_V
	case $PATTERN in
		(v*) NVM_PATTERN_STARTS_WITH_V=true  ;;
		(*) NVM_PATTERN_STARTS_WITH_V=false  ;;
	esac
	if [ $NVM_PATTERN_STARTS_WITH_V = true ] && [ "_$(nvm_num_version_groups "${PATTERN}")" = "_3" ]
	then
		if nvm_is_version_installed "${PATTERN}"
		then
			VERSIONS="${PATTERN}" 
		elif nvm_is_version_installed "$(nvm_add_iojs_prefix "${PATTERN}")"
		then
			VERSIONS="$(nvm_add_iojs_prefix "${PATTERN}")" 
		fi
	else
		case "${PATTERN}" in
			("${NVM_IOJS_PREFIX}-" | "${NVM_NODE_PREFIX}-" | "system")  ;;
			(*) local NUM_VERSION_GROUPS
				NUM_VERSION_GROUPS="$(nvm_num_version_groups "${PATTERN}")" 
				if [ "${NUM_VERSION_GROUPS}" = "2" ] || [ "${NUM_VERSION_GROUPS}" = "1" ]
				then
					PATTERN="${PATTERN%.}." 
				fi ;;
		esac
		nvm_is_zsh && setopt local_options shwordsplit
		nvm_is_zsh && unsetopt local_options markdirs
		local NVM_DIRS_TO_SEARCH1
		NVM_DIRS_TO_SEARCH1='' 
		local NVM_DIRS_TO_SEARCH2
		NVM_DIRS_TO_SEARCH2='' 
		local NVM_DIRS_TO_SEARCH3
		NVM_DIRS_TO_SEARCH3='' 
		local NVM_ADD_SYSTEM
		NVM_ADD_SYSTEM=false 
		if nvm_is_iojs_version "${PATTERN}"
		then
			NVM_DIRS_TO_SEARCH1="${NVM_VERSION_DIR_IOJS}" 
			PATTERN="$(nvm_strip_iojs_prefix "${PATTERN}")" 
			if nvm_has_system_iojs
			then
				NVM_ADD_SYSTEM=true 
			fi
		elif [ "${PATTERN}" = "${NVM_NODE_PREFIX}-" ]
		then
			NVM_DIRS_TO_SEARCH1="${NVM_VERSION_DIR_OLD}" 
			NVM_DIRS_TO_SEARCH2="${NVM_VERSION_DIR_NEW}" 
			PATTERN='' 
			if nvm_has_system_node
			then
				NVM_ADD_SYSTEM=true 
			fi
		else
			NVM_DIRS_TO_SEARCH1="${NVM_VERSION_DIR_OLD}" 
			NVM_DIRS_TO_SEARCH2="${NVM_VERSION_DIR_NEW}" 
			NVM_DIRS_TO_SEARCH3="${NVM_VERSION_DIR_IOJS}" 
			if nvm_has_system_iojs || nvm_has_system_node
			then
				NVM_ADD_SYSTEM=true 
			fi
		fi
		if ! [ -d "${NVM_DIRS_TO_SEARCH1}" ] || ! (
				command ls -1qA "${NVM_DIRS_TO_SEARCH1}" | nvm_grep -q .
			)
		then
			NVM_DIRS_TO_SEARCH1='' 
		fi
		if ! [ -d "${NVM_DIRS_TO_SEARCH2}" ] || ! (
				command ls -1qA "${NVM_DIRS_TO_SEARCH2}" | nvm_grep -q .
			)
		then
			NVM_DIRS_TO_SEARCH2="${NVM_DIRS_TO_SEARCH1}" 
		fi
		if ! [ -d "${NVM_DIRS_TO_SEARCH3}" ] || ! (
				command ls -1qA "${NVM_DIRS_TO_SEARCH3}" | nvm_grep -q .
			)
		then
			NVM_DIRS_TO_SEARCH3="${NVM_DIRS_TO_SEARCH2}" 
		fi
		local SEARCH_PATTERN
		if [ -z "${PATTERN}" ]
		then
			PATTERN='v' 
			SEARCH_PATTERN='.*' 
		else
			SEARCH_PATTERN="$(nvm_echo "${PATTERN}" | command sed 's#\.#\\\.#g;')" 
		fi
		if [ -n "${NVM_DIRS_TO_SEARCH1}${NVM_DIRS_TO_SEARCH2}${NVM_DIRS_TO_SEARCH3}" ]
		then
			VERSIONS="$(command find "${NVM_DIRS_TO_SEARCH1}"/* "${NVM_DIRS_TO_SEARCH2}"/* "${NVM_DIRS_TO_SEARCH3}"/* -name . -o -type d -prune -o -path "${PATTERN}*" \
        | command sed -e "
            s#${NVM_VERSION_DIR_IOJS}/#versions/${NVM_IOJS_PREFIX}/#;
            s#^${NVM_DIR}/##;
            \\#^[^v]# d;
            \\#^versions\$# d;
            s#^versions/##;
            s#^v#${NVM_NODE_PREFIX}/v#;
            \\#${SEARCH_PATTERN}# !d;
          " \
          -e 's#^\([^/]\{1,\}\)/\(.*\)$#\2.\1#;' \
        | command sort -t. -u -k 1.2,1n -k 2,2n -k 3,3n \
        | command sed -e 's#\(.*\)\.\([^\.]\{1,\}\)$#\2-\1#;' \
                      -e "s#^${NVM_NODE_PREFIX}-##;" \
      )" 
		fi
	fi
	if [ "${NVM_ADD_SYSTEM-}" = true ]
	then
		case "${PATTERN}" in
			('' | v) VERSIONS="${VERSIONS}
system"  ;;
			(system) VERSIONS="system"  ;;
		esac
	fi
	if [ -z "${VERSIONS}" ]
	then
		nvm_echo 'N/A'
		return 3
	fi
	nvm_echo "${VERSIONS}"
}
nvm_ls_current () {
	local NVM_LS_CURRENT_NODE_PATH
	if ! NVM_LS_CURRENT_NODE_PATH="$(command which node 2>/dev/null)" 
	then
		nvm_echo 'none'
	elif nvm_tree_contains_path "$(nvm_version_dir iojs)" "${NVM_LS_CURRENT_NODE_PATH}"
	then
		nvm_add_iojs_prefix "$(iojs --version 2>/dev/null)"
	elif nvm_tree_contains_path "${NVM_DIR}" "${NVM_LS_CURRENT_NODE_PATH}"
	then
		local VERSION
		VERSION="$(node --version 2>/dev/null)" 
		if [ "${VERSION}" = "v0.6.21-pre" ]
		then
			nvm_echo 'v0.6.21'
		else
			nvm_echo "${VERSION:-none}"
		fi
	else
		nvm_echo 'system'
	fi
}
nvm_ls_remote () {
	local PATTERN
	PATTERN="${1-}" 
	if nvm_validate_implicit_alias "${PATTERN}" 2> /dev/null
	then
		local IMPLICIT
		IMPLICIT="$(nvm_print_implicit_alias remote "${PATTERN}")" 
		if [ -z "${IMPLICIT-}" ] || [ "${IMPLICIT}" = 'N/A' ]
		then
			nvm_echo "N/A"
			return 3
		fi
		PATTERN="$(NVM_LTS="${NVM_LTS-}" nvm_ls_remote "${IMPLICIT}" | command tail -1 | command awk '{ print $1 }')" 
	elif [ -n "${PATTERN}" ]
	then
		PATTERN="$(nvm_ensure_version_prefix "${PATTERN}")" 
	else
		PATTERN=".*" 
	fi
	NVM_LTS="${NVM_LTS-}" nvm_ls_remote_index_tab node std "${PATTERN}"
}
nvm_ls_remote_index_tab () {
	local LTS
	LTS="${NVM_LTS-}" 
	if [ "$#" -lt 3 ]
	then
		nvm_err 'not enough arguments'
		return 5
	fi
	local FLAVOR
	FLAVOR="${1-}" 
	local TYPE
	TYPE="${2-}" 
	local MIRROR
	MIRROR="$(nvm_get_mirror "${FLAVOR}" "${TYPE}")" 
	if [ -z "${MIRROR}" ]
	then
		return 3
	fi
	local PREFIX
	PREFIX='' 
	case "${FLAVOR}-${TYPE}" in
		(iojs-std) PREFIX="$(nvm_iojs_prefix)-"  ;;
		(node-std) PREFIX=''  ;;
		(iojs-*) nvm_err 'unknown type of io.js release'
			return 4 ;;
		(*) nvm_err 'unknown type of node.js release'
			return 4 ;;
	esac
	local SORT_COMMAND
	SORT_COMMAND='command sort' 
	case "${FLAVOR}" in
		(node) SORT_COMMAND='command sort -t. -u -k 1.2,1n -k 2,2n -k 3,3n'  ;;
	esac
	local PATTERN
	PATTERN="${3-}" 
	if [ "${PATTERN#"${PATTERN%?}"}" = '.' ]
	then
		PATTERN="${PATTERN%.}" 
	fi
	local VERSIONS
	if [ -n "${PATTERN}" ] && [ "${PATTERN}" != '*' ]
	then
		if [ "${FLAVOR}" = 'iojs' ]
		then
			PATTERN="$(nvm_ensure_version_prefix "$(nvm_strip_iojs_prefix "${PATTERN}")")" 
		else
			PATTERN="$(nvm_ensure_version_prefix "${PATTERN}")" 
		fi
	else
		unset PATTERN
	fi
	nvm_is_zsh && setopt local_options shwordsplit
	local VERSION_LIST
	VERSION_LIST="$(nvm_download -L -s "${MIRROR}/index.tab" -o - \
    | command sed "
        1d;
        s/^/${PREFIX}/;
      " \
  )" 
	local LTS_ALIAS
	local LTS_VERSION
	command mkdir -p "$(nvm_alias_path)/lts"
	{
		command awk '{
        if ($10 ~ /^\-?$/) { next }
        if ($10 && !a[tolower($10)]++) {
          if (alias) { print alias, version }
          alias_name = "lts/" tolower($10)
          if (!alias) { print "lts/*", alias_name }
          alias = alias_name
          version = $1
        }
      }
      END {
        if (alias) {
          print alias, version
        }
      }' | while read -r LTS_ALIAS_LINE
		do
			LTS_ALIAS="${LTS_ALIAS_LINE%% *}" 
			LTS_VERSION="${LTS_ALIAS_LINE#* }" 
			nvm_make_alias "${LTS_ALIAS}" "${LTS_VERSION}" > /dev/null 2>&1
		done
	} <<EOF
$VERSION_LIST
EOF
	if [ -n "${LTS-}" ]
	then
		if ! LTS="$(nvm_normalize_lts "lts/${LTS}")" 
		then
			return $?
		fi
		LTS="${LTS#lts/}" 
	fi
	VERSIONS="$( { command awk -v lts="${LTS-}" '{
        if (!$1) { next }
        if (lts && $10 ~ /^\-?$/) { next }
        if (lts && lts != "*" && tolower($10) !~ tolower(lts)) { next }
        if ($10 !~ /^\-?$/) {
          if ($10 && $10 != prev) {
            print $1, $10, "*"
          } else {
            print $1, $10
          }
        } else {
          print $1
        }
        prev=$10;
      }' \
    | nvm_grep -w "${PATTERN:-.*}" \
    | $SORT_COMMAND; } << EOF
$VERSION_LIST
EOF
)" 
	if [ -z "${VERSIONS}" ]
	then
		nvm_echo 'N/A'
		return 3
	fi
	nvm_echo "${VERSIONS}"
}
nvm_ls_remote_iojs () {
	NVM_LTS="${NVM_LTS-}" nvm_ls_remote_index_tab iojs std "${1-}"
}
nvm_make_alias () {
	local ALIAS
	ALIAS="${1-}" 
	if [ -z "${ALIAS}" ]
	then
		nvm_err "an alias name is required"
		return 1
	fi
	local VERSION
	VERSION="${2-}" 
	if [ -z "${VERSION}" ]
	then
		nvm_err "an alias target version is required"
		return 2
	fi
	nvm_echo "${VERSION}" | tee "$(nvm_alias_path)/${ALIAS}" > /dev/null
}
nvm_match_version () {
	local NVM_IOJS_PREFIX
	NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
	local PROVIDED_VERSION
	PROVIDED_VERSION="$1" 
	case "_${PROVIDED_VERSION}" in
		("_${NVM_IOJS_PREFIX}" | '_io.js') nvm_version "${NVM_IOJS_PREFIX}" ;;
		('_system') nvm_echo 'system' ;;
		(*) nvm_version "${PROVIDED_VERSION}" ;;
	esac
}
nvm_node_prefix () {
	nvm_echo 'node'
}
nvm_node_version_has_solaris_binary () {
	local NODE_VERSION
	NODE_VERSION="$1" 
	local STRIPPED_IOJS_VERSION
	STRIPPED_IOJS_VERSION="$(nvm_strip_iojs_prefix "${NODE_VERSION}")" 
	if [ "_${STRIPPED_IOJS_VERSION}" != "_${NODE_VERSION}" ]
	then
		return 1
	fi
	nvm_version_greater_than_or_equal_to "${NODE_VERSION}" v0.8.6 && ! nvm_version_greater_than_or_equal_to "${NODE_VERSION}" v1.0.0
}
nvm_normalize_lts () {
	local LTS
	LTS="${1-}" 
	case "${LTS}" in
		(lts/-[123456789] | lts/-[123456789][0123456789]*) local N
			N="$(echo "${LTS}" | cut -d '-' -f 2)" 
			N=$((N+1)) 
			if [ $? -ne 0 ]
			then
				nvm_echo "${LTS}"
				return 0
			fi
			local NVM_ALIAS_DIR
			NVM_ALIAS_DIR="$(nvm_alias_path)" 
			local RESULT
			RESULT="$(command ls "${NVM_ALIAS_DIR}/lts" | command tail -n "${N}" | command head -n 1)" 
			if [ "${RESULT}" != '*' ]
			then
				nvm_echo "lts/${RESULT}"
			else
				nvm_err 'That many LTS releases do not exist yet.'
				return 2
			fi ;;
		(*) if [ "${LTS}" != "$(echo "${LTS}" | command tr '[:upper:]' '[:lower:]')" ]
			then
				nvm_err 'LTS names must be lowercase'
				return 3
			fi
			nvm_echo "${LTS}" ;;
	esac
}
nvm_normalize_version () {
	command awk 'BEGIN {
    split(ARGV[1], a, /\./);
    printf "%d%06d%06d\n", a[1], a[2], a[3];
    exit;
  }' "${1#v}"
}
nvm_npm_global_modules () {
	local NPMLIST
	local VERSION
	VERSION="$1" 
	NPMLIST=$(nvm use "${VERSION}" >/dev/null && npm list -g --depth=0 2>/dev/null | command sed -e '1d' -e '/UNMET PEER DEPENDENCY/d') 
	local INSTALLS
	INSTALLS=$(nvm_echo "${NPMLIST}" | command sed -e '/ -> / d' -e '/\(empty\)/ d' -e 's/^.* \(.*@[^ ]*\).*/\1/' -e '/^npm@[^ ]*.*$/ d' -e '/^corepack@[^ ]*.*$/ d' | command xargs) 
	local LINKS
	LINKS="$(nvm_echo "${NPMLIST}" | command sed -n 's/.* -> \(.*\)/\1/ p')" 
	nvm_echo "${INSTALLS} //// ${LINKS}"
}
nvm_npmrc_bad_news_bears () {
	local NVM_NPMRC
	NVM_NPMRC="${1-}" 
	if [ -n "${NVM_NPMRC}" ] && [ -f "${NVM_NPMRC}" ] && nvm_grep -Ee '^(prefix|globalconfig) *=' < "${NVM_NPMRC}" > /dev/null
	then
		return 0
	fi
	return 1
}
nvm_num_version_groups () {
	local VERSION
	VERSION="${1-}" 
	VERSION="${VERSION#v}" 
	VERSION="${VERSION%.}" 
	if [ -z "${VERSION}" ]
	then
		nvm_echo "0"
		return
	fi
	local NVM_NUM_DOTS
	NVM_NUM_DOTS=$(nvm_echo "${VERSION}" | command sed -e 's/[^\.]//g') 
	local NVM_NUM_GROUPS
	NVM_NUM_GROUPS=".${NVM_NUM_DOTS}" 
	nvm_echo "${#NVM_NUM_GROUPS}"
}
nvm_nvmrc_invalid_msg () {
	local error_text
	error_text="invalid .nvmrc!
all non-commented content (anything after # is a comment) must be either:
  - a single bare nvm-recognized version-ish
  - or, multiple distinct key-value pairs, each key/value separated by a single equals sign (=)

additionally, a single bare nvm-recognized version-ish must be present (after stripping comments)." 
	local warn_text
	warn_text="non-commented content parsed:
${1}" 
	nvm_err "$(nvm_wrap_with_color_code 'r' "${error_text}")

$(nvm_wrap_with_color_code 'y' "${warn_text}")"
}
nvm_print_alias_path () {
	local NVM_ALIAS_DIR
	NVM_ALIAS_DIR="${1-}" 
	if [ -z "${NVM_ALIAS_DIR}" ]
	then
		nvm_err 'An alias dir is required.'
		return 1
	fi
	local ALIAS_PATH
	ALIAS_PATH="${2-}" 
	if [ -z "${ALIAS_PATH}" ]
	then
		nvm_err 'An alias path is required.'
		return 2
	fi
	local ALIAS
	ALIAS="${ALIAS_PATH##"${NVM_ALIAS_DIR}"\/}" 
	local DEST
	DEST="$(nvm_alias "${ALIAS}" 2>/dev/null)"  || :
	if [ -n "${DEST}" ]
	then
		NVM_NO_COLORS="${NVM_NO_COLORS-}" NVM_LTS="${NVM_LTS-}" DEFAULT=false nvm_print_formatted_alias "${ALIAS}" "${DEST}"
	fi
}
nvm_print_color_code () {
	case "${1-}" in
		('0') return 0 ;;
		('r') nvm_echo '0;31m' ;;
		('R') nvm_echo '1;31m' ;;
		('g') nvm_echo '0;32m' ;;
		('G') nvm_echo '1;32m' ;;
		('b') nvm_echo '0;34m' ;;
		('B') nvm_echo '1;34m' ;;
		('c') nvm_echo '0;36m' ;;
		('C') nvm_echo '1;36m' ;;
		('m') nvm_echo '0;35m' ;;
		('M') nvm_echo '1;35m' ;;
		('y') nvm_echo '0;33m' ;;
		('Y') nvm_echo '1;33m' ;;
		('k') nvm_echo '0;30m' ;;
		('K') nvm_echo '1;30m' ;;
		('e') nvm_echo '0;37m' ;;
		('W') nvm_echo '1;37m' ;;
		(*) nvm_err "Invalid color code: ${1-}"
			return 1 ;;
	esac
}
nvm_print_default_alias () {
	local ALIAS
	ALIAS="${1-}" 
	if [ -z "${ALIAS}" ]
	then
		nvm_err 'A default alias is required.'
		return 1
	fi
	local DEST
	DEST="$(nvm_print_implicit_alias local "${ALIAS}")" 
	if [ -n "${DEST}" ]
	then
		NVM_NO_COLORS="${NVM_NO_COLORS-}" DEFAULT=true nvm_print_formatted_alias "${ALIAS}" "${DEST}"
	fi
}
nvm_print_formatted_alias () {
	local ALIAS
	ALIAS="${1-}" 
	local DEST
	DEST="${2-}" 
	local VERSION
	VERSION="${3-}" 
	if [ -z "${VERSION}" ]
	then
		VERSION="$(nvm_version "${DEST}")"  || :
	fi
	local VERSION_FORMAT
	local ALIAS_FORMAT
	local DEST_FORMAT
	local INSTALLED_COLOR
	local SYSTEM_COLOR
	local CURRENT_COLOR
	local NOT_INSTALLED_COLOR
	local DEFAULT_COLOR
	local LTS_COLOR
	INSTALLED_COLOR=$(nvm_get_colors 1) 
	SYSTEM_COLOR=$(nvm_get_colors 2) 
	CURRENT_COLOR=$(nvm_get_colors 3) 
	NOT_INSTALLED_COLOR=$(nvm_get_colors 4) 
	DEFAULT_COLOR=$(nvm_get_colors 5) 
	LTS_COLOR=$(nvm_get_colors 6) 
	ALIAS_FORMAT='%s' 
	DEST_FORMAT='%s' 
	VERSION_FORMAT='%s' 
	local NEWLINE
	NEWLINE='\n' 
	if [ "_${DEFAULT}" = '_true' ]
	then
		NEWLINE=' (default)\n' 
	fi
	local ARROW
	ARROW='->' 
	if nvm_has_colors
	then
		ARROW='\033[0;90m->\033[0m' 
		if [ "_${DEFAULT}" = '_true' ]
		then
			NEWLINE=" \033[${DEFAULT_COLOR}(default)\033[0m\n" 
		fi
		if [ "_${VERSION}" = "_${NVM_CURRENT-}" ]
		then
			ALIAS_FORMAT="\033[${CURRENT_COLOR}%s\033[0m" 
			DEST_FORMAT="\033[${CURRENT_COLOR}%s\033[0m" 
			VERSION_FORMAT="\033[${CURRENT_COLOR}%s\033[0m" 
		elif nvm_is_version_installed "${VERSION}"
		then
			ALIAS_FORMAT="\033[${INSTALLED_COLOR}%s\033[0m" 
			DEST_FORMAT="\033[${INSTALLED_COLOR}%s\033[0m" 
			VERSION_FORMAT="\033[${INSTALLED_COLOR}%s\033[0m" 
		elif [ "${VERSION}" = '∞' ] || [ "${VERSION}" = 'N/A' ]
		then
			ALIAS_FORMAT="\033[${NOT_INSTALLED_COLOR}%s\033[0m" 
			DEST_FORMAT="\033[${NOT_INSTALLED_COLOR}%s\033[0m" 
			VERSION_FORMAT="\033[${NOT_INSTALLED_COLOR}%s\033[0m" 
		fi
		if [ "_${NVM_LTS-}" = '_true' ]
		then
			ALIAS_FORMAT="\033[${LTS_COLOR}%s\033[0m" 
		fi
		if [ "_${DEST%/*}" = "_lts" ]
		then
			DEST_FORMAT="\033[${LTS_COLOR}%s\033[0m" 
		fi
	elif [ "_${VERSION}" != '_∞' ] && [ "_${VERSION}" != '_N/A' ]
	then
		VERSION_FORMAT='%s *' 
	fi
	if [ "${DEST}" = "${VERSION}" ]
	then
		command printf -- "${ALIAS_FORMAT} ${ARROW} ${VERSION_FORMAT}${NEWLINE}" "${ALIAS}" "${DEST}"
	else
		command printf -- "${ALIAS_FORMAT} ${ARROW} ${DEST_FORMAT} (${ARROW} ${VERSION_FORMAT})${NEWLINE}" "${ALIAS}" "${DEST}" "${VERSION}"
	fi
}
nvm_print_implicit_alias () {
	if [ "_$1" != "_local" ] && [ "_$1" != "_remote" ]
	then
		nvm_err "nvm_print_implicit_alias must be specified with local or remote as the first argument."
		return 1
	fi
	local NVM_IMPLICIT
	NVM_IMPLICIT="$2" 
	if ! nvm_validate_implicit_alias "${NVM_IMPLICIT}"
	then
		return 2
	fi
	local NVM_IOJS_PREFIX
	NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
	local NVM_NODE_PREFIX
	NVM_NODE_PREFIX="$(nvm_node_prefix)" 
	local NVM_COMMAND
	local NVM_ADD_PREFIX_COMMAND
	local LAST_TWO
	case "${NVM_IMPLICIT}" in
		("${NVM_IOJS_PREFIX}") NVM_COMMAND="nvm_ls_remote_iojs" 
			NVM_ADD_PREFIX_COMMAND="nvm_add_iojs_prefix" 
			if [ "_$1" = "_local" ]
			then
				NVM_COMMAND="nvm_ls ${NVM_IMPLICIT}" 
			fi
			nvm_is_zsh && setopt local_options shwordsplit
			local NVM_IOJS_VERSION
			local EXIT_CODE
			NVM_IOJS_VERSION="$(${NVM_COMMAND})"  && :
			EXIT_CODE="$?" 
			if [ "_${EXIT_CODE}" = "_0" ]
			then
				NVM_IOJS_VERSION="$(nvm_echo "${NVM_IOJS_VERSION}" | command sed "s/^${NVM_IMPLICIT}-//" | nvm_grep -e '^v' | command cut -c2- | command cut -d . -f 1,2 | uniq | command tail -1)" 
			fi
			if [ "_$NVM_IOJS_VERSION" = "_N/A" ]
			then
				nvm_echo 'N/A'
			else
				${NVM_ADD_PREFIX_COMMAND} "${NVM_IOJS_VERSION}"
			fi
			return $EXIT_CODE ;;
		("${NVM_NODE_PREFIX}") nvm_echo 'stable'
			return ;;
		(*) NVM_COMMAND="nvm_ls_remote" 
			if [ "_$1" = "_local" ]
			then
				NVM_COMMAND="nvm_ls node" 
			fi
			nvm_is_zsh && setopt local_options shwordsplit
			LAST_TWO=$($NVM_COMMAND | nvm_grep -e '^v' | command cut -c2- | command cut -d . -f 1,2 | uniq)  ;;
	esac
	local MINOR
	local STABLE
	local UNSTABLE
	local MOD
	local NORMALIZED_VERSION
	nvm_is_zsh && setopt local_options shwordsplit
	for MINOR in $LAST_TWO
	do
		NORMALIZED_VERSION="$(nvm_normalize_version "$MINOR")" 
		if [ "_0${NORMALIZED_VERSION#?}" != "_$NORMALIZED_VERSION" ]
		then
			STABLE="$MINOR" 
		else
			MOD="$(awk 'BEGIN { print int(ARGV[1] / 1000000) % 2 ; exit(0) }' "${NORMALIZED_VERSION}")" 
			if [ "${MOD}" -eq 0 ]
			then
				STABLE="${MINOR}" 
			elif [ "${MOD}" -eq 1 ]
			then
				UNSTABLE="${MINOR}" 
			fi
		fi
	done
	if [ "_$2" = '_stable' ]
	then
		nvm_echo "${STABLE}"
	elif [ "_$2" = '_unstable' ]
	then
		nvm_echo "${UNSTABLE:-"N/A"}"
	fi
}
nvm_print_npm_version () {
	if nvm_has "npm"
	then
		local NPM_VERSION
		NPM_VERSION="$(npm --version 2>/dev/null)" 
		if [ -n "${NPM_VERSION}" ]
		then
			command printf " (npm v${NPM_VERSION})"
		fi
	fi
}
nvm_print_versions () {
	local NVM_CURRENT
	NVM_CURRENT=$(nvm_ls_current) 
	local INSTALLED_COLOR
	local SYSTEM_COLOR
	local CURRENT_COLOR
	local NOT_INSTALLED_COLOR
	local DEFAULT_COLOR
	local LTS_COLOR
	local NVM_HAS_COLORS
	NVM_HAS_COLORS=0 
	INSTALLED_COLOR=$(nvm_get_colors 1) 
	SYSTEM_COLOR=$(nvm_get_colors 2) 
	CURRENT_COLOR=$(nvm_get_colors 3) 
	NOT_INSTALLED_COLOR=$(nvm_get_colors 4) 
	DEFAULT_COLOR=$(nvm_get_colors 5) 
	LTS_COLOR=$(nvm_get_colors 6) 
	if nvm_has_colors
	then
		NVM_HAS_COLORS=1 
	fi
	command awk -v remote_versions="$(printf '%s' "${1-}" | tr '\n' '|')" -v installed_versions="$(nvm_ls | tr '\n' '|')" -v current="$NVM_CURRENT" -v installed_color="$INSTALLED_COLOR" -v system_color="$SYSTEM_COLOR" -v current_color="$CURRENT_COLOR" -v default_color="$DEFAULT_COLOR" -v old_lts_color="$DEFAULT_COLOR" -v has_colors="$NVM_HAS_COLORS" '
function alen(arr, i, len) { len=0; for(i in arr) len++; return len; }
BEGIN {
  fmt_installed = has_colors ? (installed_color ? "\033[" installed_color "%15s\033[0m" : "%15s") : "%15s *";
  fmt_system = has_colors ? (system_color ? "\033[" system_color "%15s\033[0m" : "%15s") : "%15s *";
  fmt_current = has_colors ? (current_color ? "\033[" current_color "->%13s\033[0m" : "%15s") : "->%13s *";

  latest_lts_color = current_color;
  sub(/0;/, "1;", latest_lts_color);

  fmt_latest_lts = has_colors && latest_lts_color ? ("\033[" latest_lts_color " (Latest LTS: %s)\033[0m") : " (Latest LTS: %s)";
  fmt_old_lts = has_colors && old_lts_color ? ("\033[" old_lts_color " (LTS: %s)\033[0m") : " (LTS: %s)";

  split(remote_versions, lines, "|");
  split(installed_versions, installed, "|");
  rows = alen(lines);

  for (n = 1; n <= rows; n++) {
    split(lines[n], fields, "[[:blank:]]+");
    cols = alen(fields);
    version = fields[1];
    is_installed = 0;

    for (i in installed) {
      if (version == installed[i]) {
        is_installed = 1;
        break;
      }
    }

    fmt_version = "%15s";
    if (version == current) {
      fmt_version = fmt_current;
    } else if (version == "system") {
      fmt_version = fmt_system;
    } else if (is_installed) {
      fmt_version = fmt_installed;
    }

    padding = (!has_colors && is_installed) ? "" : "  ";

    if (cols == 1) {
      formatted = sprintf(fmt_version, version);
    } else if (cols == 2) {
      formatted = sprintf((fmt_version padding fmt_old_lts), version, fields[2]);
    } else if (cols == 3 && fields[3] == "*") {
      formatted = sprintf((fmt_version padding fmt_latest_lts), version, fields[2]);
    }

    output[n] = formatted;
  }

  for (n = 1; n <= rows; n++) {
    print output[n]
  }

  exit
}'
}
nvm_process_nvmrc () {
	local NVMRC_PATH
	NVMRC_PATH="$1" 
	local lines
	lines=$(command sed 's/#.*//' "$NVMRC_PATH" | command sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | nvm_grep -v '^$') 
	if [ -z "$lines" ]
	then
		nvm_nvmrc_invalid_msg "${lines}"
		return 1
	fi
	local keys
	keys='' 
	local values
	values='' 
	local unpaired_line
	unpaired_line='' 
	while IFS= read -r line
	do
		if [ -z "${line}" ]
		then
			continue
		elif [ -z "${line%%=*}" ]
		then
			if [ -n "${unpaired_line}" ]
			then
				nvm_nvmrc_invalid_msg "${lines}"
				return 1
			fi
			unpaired_line="${line}" 
		elif case "$line" in
				(*'='*) true ;;
				(*) false ;;
			esac
		then
			key="${line%%=*}" 
			value="${line#*=}" 
			key=$(nvm_echo "${key}" | command sed 's/^[[:space:]]*//;s/[[:space:]]*$//') 
			value=$(nvm_echo "${value}" | command sed 's/^[[:space:]]*//;s/[[:space:]]*$//') 
			if [ "${key}" = 'node' ]
			then
				nvm_nvmrc_invalid_msg "${lines}"
				return 1
			fi
			if nvm_echo "${keys}" | nvm_grep -q -E "(^| )${key}( |$)"
			then
				nvm_nvmrc_invalid_msg "${lines}"
				return 1
			fi
			keys="${keys} ${key}" 
			values="${values} ${value}" 
		else
			if [ -n "${unpaired_line}" ]
			then
				nvm_nvmrc_invalid_msg "${lines}"
				return 1
			fi
			unpaired_line="${line}" 
		fi
	done <<EOF
$lines
EOF
	if [ -z "${unpaired_line}" ]
	then
		nvm_nvmrc_invalid_msg "${lines}"
		return 1
	fi
	nvm_echo "${unpaired_line}"
}
nvm_process_parameters () {
	local NVM_AUTO_MODE
	NVM_AUTO_MODE='use' 
	while [ "$#" -ne 0 ]
	do
		case "$1" in
			(--install) NVM_AUTO_MODE='install'  ;;
			(--no-use) NVM_AUTO_MODE='none'  ;;
		esac
		shift
	done
	nvm_auto "${NVM_AUTO_MODE}"
}
nvm_rc_version () {
	export NVM_RC_VERSION='' 
	local NVMRC_PATH
	NVMRC_PATH="$(nvm_find_nvmrc)" 
	if [ ! -e "${NVMRC_PATH}" ]
	then
		if [ "${NVM_SILENT:-0}" -ne 1 ]
		then
			nvm_err "No .nvmrc file found"
		fi
		return 1
	fi
	if ! NVM_RC_VERSION="$(nvm_process_nvmrc "${NVMRC_PATH}")" 
	then
		return 1
	fi
	if [ -z "${NVM_RC_VERSION}" ]
	then
		if [ "${NVM_SILENT:-0}" -ne 1 ]
		then
			nvm_err "Warning: empty .nvmrc file found at \"${NVMRC_PATH}\""
		fi
		return 2
	fi
	if [ "${NVM_SILENT:-0}" -ne 1 ]
	then
		nvm_echo "Found '${NVMRC_PATH}' with version <${NVM_RC_VERSION}>"
	fi
}
nvm_remote_version () {
	local PATTERN
	PATTERN="${1-}" 
	local VERSION
	if nvm_validate_implicit_alias "${PATTERN}" 2> /dev/null
	then
		case "${PATTERN}" in
			("$(nvm_iojs_prefix)") VERSION="$(NVM_LTS="${NVM_LTS-}" nvm_ls_remote_iojs | command tail -1)"  && : ;;
			(*) VERSION="$(NVM_LTS="${NVM_LTS-}" nvm_ls_remote "${PATTERN}")"  && : ;;
		esac
	else
		VERSION="$(NVM_LTS="${NVM_LTS-}" nvm_remote_versions "${PATTERN}" | command tail -1)" 
	fi
	if [ -n "${NVM_VERSION_ONLY-}" ]
	then
		command awk 'BEGIN {
      n = split(ARGV[1], a);
      print a[1]
    }' "${VERSION}"
	else
		nvm_echo "${VERSION}"
	fi
	if [ "${VERSION}" = 'N/A' ]
	then
		return 3
	fi
}
nvm_remote_versions () {
	local NVM_IOJS_PREFIX
	NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
	local NVM_NODE_PREFIX
	NVM_NODE_PREFIX="$(nvm_node_prefix)" 
	local PATTERN
	PATTERN="${1-}" 
	local NVM_FLAVOR
	if [ -n "${NVM_LTS-}" ]
	then
		NVM_FLAVOR="${NVM_NODE_PREFIX}" 
	fi
	case "${PATTERN}" in
		("${NVM_IOJS_PREFIX}" | "io.js") NVM_FLAVOR="${NVM_IOJS_PREFIX}" 
			unset PATTERN ;;
		("${NVM_NODE_PREFIX}") NVM_FLAVOR="${NVM_NODE_PREFIX}" 
			unset PATTERN ;;
	esac
	if nvm_validate_implicit_alias "${PATTERN-}" 2> /dev/null
	then
		nvm_err 'Implicit aliases are not supported in nvm_remote_versions.'
		return 1
	fi
	local NVM_LS_REMOTE_EXIT_CODE
	NVM_LS_REMOTE_EXIT_CODE=0 
	local NVM_LS_REMOTE_PRE_MERGED_OUTPUT
	NVM_LS_REMOTE_PRE_MERGED_OUTPUT='' 
	local NVM_LS_REMOTE_POST_MERGED_OUTPUT
	NVM_LS_REMOTE_POST_MERGED_OUTPUT='' 
	if [ -z "${NVM_FLAVOR-}" ] || [ "${NVM_FLAVOR-}" = "${NVM_NODE_PREFIX}" ]
	then
		local NVM_LS_REMOTE_OUTPUT
		NVM_LS_REMOTE_OUTPUT="$(NVM_LTS="${NVM_LTS-}" nvm_ls_remote "${PATTERN-}") "  && :
		NVM_LS_REMOTE_EXIT_CODE=$? 
		NVM_LS_REMOTE_PRE_MERGED_OUTPUT="${NVM_LS_REMOTE_OUTPUT%%v4\.0\.0*}" 
		NVM_LS_REMOTE_POST_MERGED_OUTPUT="${NVM_LS_REMOTE_OUTPUT#"$NVM_LS_REMOTE_PRE_MERGED_OUTPUT"}" 
	fi
	local NVM_LS_REMOTE_IOJS_EXIT_CODE
	NVM_LS_REMOTE_IOJS_EXIT_CODE=0 
	local NVM_LS_REMOTE_IOJS_OUTPUT
	NVM_LS_REMOTE_IOJS_OUTPUT='' 
	if [ -z "${NVM_LTS-}" ] && {
			[ -z "${NVM_FLAVOR-}" ] || [ "${NVM_FLAVOR-}" = "${NVM_IOJS_PREFIX}" ]
		}
	then
		NVM_LS_REMOTE_IOJS_OUTPUT=$(nvm_ls_remote_iojs "${PATTERN-}")  && :
		NVM_LS_REMOTE_IOJS_EXIT_CODE=$? 
	fi
	VERSIONS="$(nvm_echo "${NVM_LS_REMOTE_PRE_MERGED_OUTPUT}
${NVM_LS_REMOTE_IOJS_OUTPUT}
${NVM_LS_REMOTE_POST_MERGED_OUTPUT}" | nvm_grep -v "N/A" | command sed '/^ *$/d')" 
	if [ -z "${VERSIONS}" ]
	then
		nvm_echo 'N/A'
		return 3
	fi
	nvm_echo "${VERSIONS}" | command sed 's/ *$//g'
	return $NVM_LS_REMOTE_EXIT_CODE || $NVM_LS_REMOTE_IOJS_EXIT_CODE
}
nvm_resolve_alias () {
	if [ -z "${1-}" ]
	then
		return 1
	fi
	local PATTERN
	PATTERN="${1-}" 
	local ALIAS
	ALIAS="${PATTERN}" 
	local ALIAS_TEMP
	local SEEN_ALIASES
	SEEN_ALIASES="${ALIAS}" 
	local NVM_ALIAS_INDEX
	NVM_ALIAS_INDEX=1 
	while true
	do
		ALIAS_TEMP="$( (nvm_alias "${ALIAS}" 2>/dev/null | command head -n "${NVM_ALIAS_INDEX}" | command tail -n 1) || nvm_echo)" 
		if [ -z "${ALIAS_TEMP}" ]
		then
			break
		fi
		if command printf "${SEEN_ALIASES}" | nvm_grep -q -e "^${ALIAS_TEMP}$"
		then
			ALIAS="∞" 
			break
		fi
		SEEN_ALIASES="${SEEN_ALIASES}\\n${ALIAS_TEMP}" 
		ALIAS="${ALIAS_TEMP}" 
	done
	if [ -n "${ALIAS}" ] && [ "_${ALIAS}" != "_${PATTERN}" ]
	then
		local NVM_IOJS_PREFIX
		NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
		local NVM_NODE_PREFIX
		NVM_NODE_PREFIX="$(nvm_node_prefix)" 
		case "${ALIAS}" in
			('∞' | "${NVM_IOJS_PREFIX}" | "${NVM_IOJS_PREFIX}-" | "${NVM_NODE_PREFIX}") nvm_echo "${ALIAS}" ;;
			(*) nvm_ensure_version_prefix "${ALIAS}" ;;
		esac
		return 0
	fi
	if nvm_validate_implicit_alias "${PATTERN}" 2> /dev/null
	then
		local IMPLICIT
		IMPLICIT="$(nvm_print_implicit_alias local "${PATTERN}" 2>/dev/null)" 
		if [ -n "${IMPLICIT}" ]
		then
			nvm_ensure_version_prefix "${IMPLICIT}"
		fi
	fi
	return 2
}
nvm_resolve_local_alias () {
	if [ -z "${1-}" ]
	then
		return 1
	fi
	local VERSION
	local EXIT_CODE
	VERSION="$(nvm_resolve_alias "${1-}")" 
	EXIT_CODE=$? 
	if [ -z "${VERSION}" ]
	then
		return $EXIT_CODE
	fi
	if [ "_${VERSION}" != '_∞' ]
	then
		nvm_version "${VERSION}"
	else
		nvm_echo "${VERSION}"
	fi
}
nvm_sanitize_auth_header () {
	nvm_echo "$1" | command sed 's/[^a-zA-Z0-9:;_. -]//g'
}
nvm_sanitize_path () {
	local SANITIZED_PATH
	SANITIZED_PATH="${1-}" 
	if [ "_${SANITIZED_PATH}" != "_${NVM_DIR}" ]
	then
		SANITIZED_PATH="$(nvm_echo "${SANITIZED_PATH}" | command sed -e "s#${NVM_DIR}#\${NVM_DIR}#g")" 
	fi
	if [ "_${SANITIZED_PATH}" != "_${HOME}" ]
	then
		SANITIZED_PATH="$(nvm_echo "${SANITIZED_PATH}" | command sed -e "s#${HOME}#\${HOME}#g")" 
	fi
	nvm_echo "${SANITIZED_PATH}"
}
nvm_set_colors () {
	if [ "${#1}" -eq 5 ] && nvm_echo "$1" | nvm_grep -E "^[rRgGbBcCyYmMkKeW]{1,}$" > /dev/null
	then
		local INSTALLED_COLOR
		local LTS_AND_SYSTEM_COLOR
		local CURRENT_COLOR
		local NOT_INSTALLED_COLOR
		local DEFAULT_COLOR
		INSTALLED_COLOR="$(echo "$1" | awk '{ print substr($0, 1, 1); }')" 
		LTS_AND_SYSTEM_COLOR="$(echo "$1" | awk '{ print substr($0, 2, 1); }')" 
		CURRENT_COLOR="$(echo "$1" | awk '{ print substr($0, 3, 1); }')" 
		NOT_INSTALLED_COLOR="$(echo "$1" | awk '{ print substr($0, 4, 1); }')" 
		DEFAULT_COLOR="$(echo "$1" | awk '{ print substr($0, 5, 1); }')" 
		if ! nvm_has_colors
		then
			nvm_echo "Setting colors to: ${INSTALLED_COLOR} ${LTS_AND_SYSTEM_COLOR} ${CURRENT_COLOR} ${NOT_INSTALLED_COLOR} ${DEFAULT_COLOR}"
			nvm_echo "WARNING: Colors may not display because they are not supported in this shell."
		else
			nvm_echo_with_colors "Setting colors to: $(nvm_wrap_with_color_code "${INSTALLED_COLOR}" "${INSTALLED_COLOR}")$(nvm_wrap_with_color_code "${LTS_AND_SYSTEM_COLOR}" "${LTS_AND_SYSTEM_COLOR}")$(nvm_wrap_with_color_code "${CURRENT_COLOR}" "${CURRENT_COLOR}")$(nvm_wrap_with_color_code "${NOT_INSTALLED_COLOR}" "${NOT_INSTALLED_COLOR}")$(nvm_wrap_with_color_code "${DEFAULT_COLOR}" "${DEFAULT_COLOR}")"
		fi
		export NVM_COLORS="$1" 
	else
		return 17
	fi
}
nvm_stdout_is_terminal () {
	[ -t 1 ]
}
nvm_strip_iojs_prefix () {
	local NVM_IOJS_PREFIX
	NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
	case "${1-}" in
		("${NVM_IOJS_PREFIX}") nvm_echo ;;
		(*) nvm_echo "${1#"${NVM_IOJS_PREFIX}"-}" ;;
	esac
}
nvm_strip_path () {
	if [ -z "${NVM_DIR-}" ]
	then
		nvm_err '${NVM_DIR} not set!'
		return 1
	fi
	command printf %s "${1-}" | command awk -v NVM_DIR="${NVM_DIR}" -v RS=: '
  index($0, NVM_DIR) == 1 {
    path = substr($0, length(NVM_DIR) + 1)
    if (path ~ "^(/versions/[^/]*)?/[^/]*'"${2-}"'.*$") { next }
  }
  # The final RT will contain a colon if the input has a trailing colon, or a null string otherwise
  { printf "%s%s", sep, $0; sep=RS } END { printf "%s", RT }'
}
nvm_supports_xz () {
	if [ -z "${1-}" ]
	then
		return 1
	fi
	local NVM_OS
	NVM_OS="$(nvm_get_os)" 
	if [ "_${NVM_OS}" = '_darwin' ]
	then
		local MACOS_VERSION
		MACOS_VERSION="$(sw_vers -productVersion)" 
		if nvm_version_greater "10.9.0" "${MACOS_VERSION}"
		then
			return 1
		fi
	elif [ "_${NVM_OS}" = '_freebsd' ]
	then
		if ! [ -e '/usr/lib/liblzma.so' ]
		then
			return 1
		fi
	else
		if ! command which xz > /dev/null 2>&1
		then
			return 1
		fi
	fi
	if nvm_is_merged_node_version "${1}"
	then
		return 0
	fi
	if nvm_version_greater_than_or_equal_to "${1}" "0.12.10" && nvm_version_greater "0.13.0" "${1}"
	then
		return 0
	fi
	if nvm_version_greater_than_or_equal_to "${1}" "0.10.42" && nvm_version_greater "0.11.0" "${1}"
	then
		return 0
	fi
	case "${NVM_OS}" in
		(darwin) nvm_version_greater_than_or_equal_to "${1}" "2.3.2" ;;
		(*) nvm_version_greater_than_or_equal_to "${1}" "1.0.0" ;;
	esac
	return $?
}
nvm_tree_contains_path () {
	local tree
	tree="${1-}" 
	local node_path
	node_path="${2-}" 
	if [ "@${tree}@" = "@@" ] || [ "@${node_path}@" = "@@" ]
	then
		nvm_err "both the tree and the node path are required"
		return 2
	fi
	local previous_pathdir
	previous_pathdir="${node_path}" 
	local pathdir
	pathdir=$(dirname "${previous_pathdir}") 
	while [ "${pathdir}" != '' ] && [ "${pathdir}" != '.' ] && [ "${pathdir}" != '/' ] && [ "${pathdir}" != "${tree}" ] && [ "${pathdir}" != "${previous_pathdir}" ]
	do
		previous_pathdir="${pathdir}" 
		pathdir=$(dirname "${previous_pathdir}") 
	done
	[ "${pathdir}" = "${tree}" ]
}
nvm_use_if_needed () {
	if [ "_${1-}" = "_$(nvm_ls_current)" ]
	then
		return
	fi
	nvm use "$@"
}
nvm_validate_implicit_alias () {
	local NVM_IOJS_PREFIX
	NVM_IOJS_PREFIX="$(nvm_iojs_prefix)" 
	local NVM_NODE_PREFIX
	NVM_NODE_PREFIX="$(nvm_node_prefix)" 
	case "$1" in
		("stable" | "unstable" | "${NVM_IOJS_PREFIX}" | "${NVM_NODE_PREFIX}") return ;;
		(*) nvm_err "Only implicit aliases 'stable', 'unstable', '${NVM_IOJS_PREFIX}', and '${NVM_NODE_PREFIX}' are supported."
			return 1 ;;
	esac
}
nvm_version () {
	local PATTERN
	PATTERN="${1-}" 
	local VERSION
	if [ -z "${PATTERN}" ]
	then
		PATTERN='current' 
	fi
	if [ "${PATTERN}" = "current" ]
	then
		nvm_ls_current
		return $?
	fi
	local NVM_NODE_PREFIX
	NVM_NODE_PREFIX="$(nvm_node_prefix)" 
	case "_${PATTERN}" in
		("_${NVM_NODE_PREFIX}" | "_${NVM_NODE_PREFIX}-") PATTERN="stable"  ;;
	esac
	VERSION="$(nvm_ls "${PATTERN}" | command tail -1)" 
	if [ -z "${VERSION}" ] || [ "_${VERSION}" = "_N/A" ]
	then
		nvm_echo "N/A"
		return 3
	fi
	nvm_echo "${VERSION}"
}
nvm_version_dir () {
	local NVM_WHICH_DIR
	NVM_WHICH_DIR="${1-}" 
	if [ -z "${NVM_WHICH_DIR}" ] || [ "${NVM_WHICH_DIR}" = "new" ]
	then
		nvm_echo "${NVM_DIR}/versions/node"
	elif [ "_${NVM_WHICH_DIR}" = "_iojs" ]
	then
		nvm_echo "${NVM_DIR}/versions/io.js"
	elif [ "_${NVM_WHICH_DIR}" = "_old" ]
	then
		nvm_echo "${NVM_DIR}"
	else
		nvm_err 'unknown version dir'
		return 3
	fi
}
nvm_version_greater () {
	command awk 'BEGIN {
    if (ARGV[1] == "" || ARGV[2] == "") exit(1)
    split(ARGV[1], a, /\./);
    split(ARGV[2], b, /\./);
    for (i=1; i<=3; i++) {
      if (a[i] && a[i] !~ /^[0-9]+$/) exit(2);
      if (b[i] && b[i] !~ /^[0-9]+$/) { exit(0); }
      if (a[i] < b[i]) exit(3);
      else if (a[i] > b[i]) exit(0);
    }
    exit(4)
  }' "${1#v}" "${2#v}"
}
nvm_version_greater_than_or_equal_to () {
	command awk 'BEGIN {
    if (ARGV[1] == "" || ARGV[2] == "") exit(1)
    split(ARGV[1], a, /\./);
    split(ARGV[2], b, /\./);
    for (i=1; i<=3; i++) {
      if (a[i] && a[i] !~ /^[0-9]+$/) exit(2);
      if (a[i] < b[i]) exit(3);
      else if (a[i] > b[i]) exit(0);
    }
    exit(0)
  }' "${1#v}" "${2#v}"
}
nvm_version_path () {
	local VERSION
	VERSION="${1-}" 
	if [ -z "${VERSION}" ]
	then
		nvm_err 'version is required'
		return 3
	elif nvm_is_iojs_version "${VERSION}"
	then
		nvm_echo "$(nvm_version_dir iojs)/$(nvm_strip_iojs_prefix "${VERSION}")"
	elif nvm_version_greater 0.12.0 "${VERSION}"
	then
		nvm_echo "$(nvm_version_dir old)/${VERSION}"
	else
		nvm_echo "$(nvm_version_dir new)/${VERSION}"
	fi
}
nvm_wrap_with_color_code () {
	local CODE
	CODE="$(nvm_print_color_code "${1}" 2>/dev/null ||:)" 
	local TEXT
	TEXT="${2-}" 
	if nvm_has_colors && [ -n "${CODE}" ]
	then
		nvm_echo_with_colors "\033[${CODE}${TEXT}\033[0m"
	else
		nvm_echo "${TEXT}"
	fi
}
nvm_write_nvmrc () {
	local VERSION_STRING
	VERSION_STRING=$(nvm_version "${1-}") 
	if [ "${VERSION_STRING}" = '∞' ] || [ "${VERSION_STRING}" = 'N/A' ]
	then
		return 1
	fi
	echo "${VERSION_STRING}" | tee "$PWD"/.nvmrc > /dev/null || {
		if [ "${NVM_SILENT:-0}" -ne 1 ]
		then
			nvm_err "Warning: Unable to write version number ($VERSION_STRING) to .nvmrc"
		fi
		return 3
	}
	if [ "${NVM_SILENT:-0}" -ne 1 ]
	then
		nvm_echo "Wrote version number ($VERSION_STRING) to .nvmrc"
	fi
}
osc7_cwd () {
	local strlen=${#PWD} 
	local encoded="" 
	local i c
	for ((i = 1; i <= strlen; ++i )) do
		c="${PWD[i]}" 
		case "$c" in
			([-_.~a-zA-Z0-9/]) encoded+="$c"  ;;
			(*) encoded+=$(printf '%%%02X' "'$c")  ;;
		esac
	done
	printf '\e]7;file://%s%s\e\\' "${HOST}" "${encoded}"
}
prompt_starship_precmd () {
	STARSHIP_CMD_STATUS=$? STARSHIP_PIPE_STATUS=(${pipestatus[@]}) 
	if (( ${+STARSHIP_START_TIME} ))
	then
		__starship_get_time && STARSHIP_DURATION=$(( STARSHIP_CAPTURED_TIME - STARSHIP_START_TIME )) 
		unset STARSHIP_START_TIME
	else
		unset STARSHIP_DURATION STARSHIP_CMD_STATUS STARSHIP_PIPE_STATUS
	fi
	STARSHIP_JOBS_COUNT="${#jobstates[*]}" 
}
prompt_starship_preexec () {
	__starship_get_time && STARSHIP_START_TIME=$STARSHIP_CAPTURED_TIME 
}
self-atuin-ai-question-mark () {
	if [[ -z "$BUFFER" || "$BUFFER" == "?" ]]
	then
		BUFFER="" 
		local output
		output=$(atuin ai inline --hook 3>&1 1>&2 2>&3) 
		_atuin_ai_cleanup
		if [[ $output == __atuin_ai_print__:* ]]
		then
			zle -I
			echo "${output#__atuin_ai_print__:}"
		elif [[ $output == __atuin_ai_cancel__ ]]
		then
			zle reset-prompt
		elif [[ $output == __atuin_ai_execute__:* ]]
		then
			RBUFFER="" 
			LBUFFER=${output#__atuin_ai_execute__:} 
			zle reset-prompt
			zle accept-line
		elif [[ $output == __atuin_ai_insert__:* ]]
		then
			RBUFFER="" 
			LBUFFER=${output#__atuin_ai_insert__:} 
			zle reset-prompt
		elif [[ -n $output ]]
		then
			RBUFFER="" 
			LBUFFER=$output 
			zle reset-prompt
		else
			zle reset-prompt
		fi
	else
		zle self-insert
	fi
}
sonnet () {
	ANTHROPIC_MODEL="claude-sonnet-4-6" claude "$@"
}
starship_zle-keymap-select () {
	zle reset-prompt
}
thclaws-cli () {
	thclaws --cli --accept-all "$@"
}

# setopts 10
setopt extendedhistory
setopt nohashdirs
setopt histignoredups
setopt histignorespace
setopt histreduceblanks
setopt histverify
setopt incappendhistorytime
setopt login
setopt promptsubst
setopt sharehistory

# aliases 4
alias gr='cd $(ghq list --full-path | fzf)'
alias python=python3
alias run-help=man
alias which-command=whence

# exports 62
export ATUIN_HISTORY_ID=''
export ATUIN_SESSION=019f50686a7072b39779e9b599f223c0
export ATUIN_SHLVL=3
export ATUIN_TMUX_POPUP=false
export BUN_INSTALL=/Users/nat/.bun
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
export CLAUDE_CODE_OAUTH_TOKEN=''
export CLAUDE_TOKEN_NAME=ting-ting
export CODEX_HOME=/opt/Code/github.com/nazt/maw-serve/agents/consumer-clients/.codex
export COLORTERM=truecolor
export COMMAND_MODE=unix2003
export DIRENV_DIFF='eJxUjs1yqjAARt8la7mtoDIw00WEKGD4jyV0k7lFpJQSAcEgju9-x7txuvkW55zFdwMN0G_3GeBAvwEDw72JmOGbiCEaoMh2kUcgZnCLPMIIgm4MdDAHs1-pD_fEYsTfIQ_o4Cn_E-ZBFwEd9CUvpMeAGTDtCHnvzLQjoAPp5dT0T7ix8SN_wJc_Ob902dMlkBgWelzInWs2Vb0PJ-RCz1A_Nq9z63qQX_kgwvIay5u0I0nexnFRzPEw4a1YCifIV2q-nNNKdmRfkdXISnJN9cRhUuhX3tWOz8uCl7YlUp9M7pCKRq3ZVQrEj6GZWm1Rf5iPMm0OqvlNaTweDz_80pcq1urtZ1qftf2QhrVZjpv2tB5t9zvss0XRfGSwRe05lZZpYEdGaZ92OT7uxSIKORHKGGCpTpbvmRKek3pNG0fYZ_nv2hq7CzW9Ko2ysorbC-XB1hxXX2K3Tk94MUhxjlYKrtzjJxEQwoAxvxy7HXx7A_f7vwAAAP__lPiXsQ=='
export DIRENV_DIR=-/opt
export DIRENV_FILE=/opt/.envrc
export DIRENV_WATCHES='eJyczktOAzEMANC7ZF01Hyd20nuwQiyS2FYrTWeqSSgg1LuzLGw5wJPe67e51Xk2J2O327RHWe97Nwdz3XhermJOnigniIHwYOTzMuYwp7m_y-PwlC9D9mHXOu1x2Xpd7DjXXSxfdlnvti7L9mGbYms9UuYQmDixFqoBxIMjQtc4gpZcAqEqsY-5YPIRCiIoKeLfUw4RQnTw3xPL-mW5Vc3QsWmBXpJwIs2aBHxrvXDNkYRcikSqvXnPGDx6hwKBYoL4u-SeE63LkMfbTwAAAP__OixrKA=='
export GLM_API_KEY=4dfb7c42d05447a79ff6d50be78048cd.s8NKIprvFH52AzW6
export HOME=/Users/nat
export HOMEBREW_CELLAR=/opt/homebrew/Cellar
export HOMEBREW_PREFIX=/opt/homebrew
export HOMEBREW_REPOSITORY=/opt/homebrew
export INFOPATH=/opt/homebrew/share/info:/opt/homebrew/share/info:/opt/homebrew/share/info:/opt/homebrew/share/info:/opt/homebrew/share/info:/opt/homebrew/share/info:/opt/homebrew/share/info:
export LANG=en_US.UTF-8
export LOGNAME=nat
export LaunchInstanceID=4E0B5FB2-4EA7-419E-84DE-79F20E599860
export NVM_BIN=/Users/nat/.nvm/versions/node/v24.15.0/bin
export NVM_CD_FLAGS=-q
export NVM_DIR=/Users/nat/.nvm
export NVM_INC=/Users/nat/.nvm/versions/node/v24.15.0/include/node
export OMXBOX_ACTIVE=1
export OMX_AUTO_UPDATE=0
export OMX_ENTRY_PATH=/Users/nat/.nvm/versions/node/v24.15.0/lib/node_modules/oh-my-codex/dist/cli/omx.js
export OMX_MADMAX_DETACHED_CONTEXT=d97fd37084749c7bc2da0c73b58c3573
export OMX_NOTIFY_FALLBACK=0
export OMX_ROOT=/Users/nat/.omx-runs/run-20260711085955-5dfb
export OMX_SESSION_ID=omx-1783760395687-v3a1sd
export OMX_SOURCE_CWD=/opt/Code/github.com/nazt/maw-serve/agents/consumer-clients
export OMX_STARTUP_CWD=/opt/Code/github.com/nazt/maw-serve/agents/consumer-clients
export OMX_TEAM_WORKER_LAUNCH_ARGS=--dangerously-bypass-approvals-and-sandbox
export OMX_TMUX_HUD_OWNER=1
export OSLogRateLimit=64
export SECURITYSESSIONID=186b8
export SHELL=/bin/zsh
export SSH_AUTH_SOCK=/var/run/com.apple.launchd.ig0l3dtlcV/Listeners
export STARSHIP_SESSION_KEY=1198658281328935
export STARSHIP_SHELL=zsh
export TERM=tmux-256color
export TERM_PROGRAM=tmux
export TERM_PROGRAM_VERSION=3.6a
export TMPDIR=/var/folders/lf/s98q6y892sl__0brv1tyn0ch0000gn/T/
export TMUX=/private/tmp/tmux-501/default,62456,510
export TMUX_PANE=%3092
export USER=nat
export WEZTERM_CONFIG_DIR=/Users/nat
export WEZTERM_CONFIG_FILE=/Users/nat/.wezterm.lua
export WEZTERM_EXECUTABLE=/Applications/WezTerm.app/Contents/MacOS/wezterm-gui
export WEZTERM_EXECUTABLE_DIR=/Applications/WezTerm.app/Contents/MacOS
export WEZTERM_PANE=0
export WEZTERM_UNIX_SOCKET=/Users/nat/.local/share/wezterm/gui-sock-753
export XPC_FLAGS=0x0
export XPC_SERVICE_NAME=0
export __CFBundleIdentifier=com.github.wez.wezterm
export __CF_USER_TEXT_ENCODING=0x1F5:0x0:0x0
