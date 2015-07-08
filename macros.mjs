#metamodule

  #keepmacro #doto
    binaryKeyword
    LOW
    expand: (instance, ops) ->
      if (instance.placeholder?())
        `undefined
      else if (ops.placeholder?())
        instance
      else do
        #external (gensym, declaration)
        var temp = instance.new-tag gensym 'doto'
        var body = ops.as-tuple().map
          template ->
            var has-placeholders = false
            var op = template.copy ()
            op.for-each-recursive
              c -> do!
                if (c.placeholder?())
                  has-placeholders = true
                  c.replace-with temp.copy ()
            if (op.call?())
              if has-placeholders
                op
              else
                `(~`op.at 0) (~`temp, ~`op.at 1)
            else
              if has-placeholders
                if (template.id == '.')
                 `(~`op) ()
                else
                  op
              else
                `(~`op) (~`temp)
        `do
          var (~`declaration(temp)) = ~`instance
          ~`body
          ~`temp


  #keepmacro assert!
    unary
    LOW
    expand: condition ->
      #external (declaration, gensym)

      var message = ast.new-value('assertion failed: ' + condition.print-ast())
      var temp = condition.new-tag(gensym())
      `do
        var ~`declaration(temp) = ~`condition
        if (! ~`temp )
          throw Error(~`message)
        ~`temp


  #keepmacro #let
    binaryKeyword
    LOWEST
    expand: (assignment, body) ->
      #external (declaration, gensym)

      if (assignment.id != '=')
        throw Error('expecting assignment as first operand')

      var destructure-tag = (binding, value) ->
        `(var ~`declaration(binding) = ~`value)

      var destructure-array = (binding, value) ->
        var value-var = binding.new-tag(gensym())
        var first-var = binding.new-tag(value-var.get-tag() + '_v')
        var last = binding.at(binding.count - 1)
        var decls = binding.map
          e ->
            if (e == last)
              `
                var ~`declaration(e) = mori.first(~`value-var)
            else
              `
                var ~`declaration(e) = do
                  var ~`declaration(first-var) = mori.first(~`value-var)
                  ~`value-var = mori.rest(~`value-var)
                  ~`first-var

        do `
          var ~`declaration(value-var) = mori.seq(~`value)
          ~`decls

      var destructure-object = (binding, value) ->

        var map-val =
          e ->
            `mori.get(~`value, ~`(ast.new-value(e.get-tag())))

        var object-val =
          e ->
            `(~`value).(~`e)

        var name-of = property ->
          if (property.tag?())
            property
          else
            property.at 0

        var value-of = property ->
          if (property.tag?())
            property
          else
            property.at 1

        var comp =
          (f, g) ->
            x -> f (g x)

        var ->declaration = comp(declaration, name-of)
        var ->object-val = comp(object-val, value-of)
        var ->map-val = comp(map-val, value-of)
        var to = f -> binding.map f
        var tuple-of = f -> binding.new-tuple(to f)
        var (decls, obj-vals, map-vals, undef-vals) =
          if (binding.count > 1)
            tuple-of ->declaration
            tuple-of ->object-val
            tuple-of ->map-val
            tuple-of #-> `undefined
          else
            to ->declaration
            to ->object-val
            to ->map-val
            to #-> `undefined

        `(var (~`decls) =
          if ((~`value) == undefined || (~`value) == null) (~`undef-vals)
          else if (mori.is_map(~`value)) (~`map-vals)
          else (~`obj-vals))

      var destructurer-for = binding ->
        if (binding.object?()) destructure-object
        else if (binding.array?()) destructure-array
        else if (binding.tag?()) destructure-tag
        else throw Error('unsupported destructuring pattern `' + binding.print-ast() + "'")

      var binding = assignment.at 0
      var value = assignment.at 1
      var value-var = binding.new-tag(gensym())
      var d = destructurer-for(binding)(binding, value-var)
      `do
        var (~`declaration value-var) = (~`value)
        ~`d
        ~`body


  #keepmacro |>
    binary
    LOW
    expand: (value, ops) ->
      #external (declaration, gensym)

      var replace-all = (placeholders, form) ->
        placeholders.for-each
          ph -> ph.replace-with(form.copy())

      var placeholders-in = form ->
        var phs = []
        form.for-each-recursive
          c -> do! if (c.placeholder?()) phs.push c
        phs

      #external pipe-reduce
      pipe-reduce
        value
        ops
        (acc, op) ->
          var phs = placeholders-in op
          if phs.length do
            if (phs.length > 1 && !acc.tag?())
              var fst = phs[0]
              var temp = fst.new-tag(gensym())
              fst.replace-with
                `(var ~`declaration(temp) = ~`acc)
              replace-all(phs.slice 1, temp)
            else
              replace-all(phs, acc)
            op
          else
            ` (~`op) (~`acc)


  #keepmacro |>>
    binary
    LOW
    expand: (value, ops) ->
      #external pipe-reduce
      pipe-reduce
        value
        ops
        (acc, op) ->
          if (op.call?()) do
            op.at(1).as-tuple().push acc
            op
          else
            ` (~`op)(~`acc)


  #keepmacro |.>
    binary
    LOW
    expand: (value, ops) ->
      ; have to keep a duplicate of pipe-reduce here
      ; because fun depends on |.> but pipe-reduce
      ; is defined later in the file
      var pipe-reduce = (lhs, rhs, reducer) ->
        var tuple = rhs.as-tuple()
        if (lhs.placeholder?())
          tuple.map(it -> it).reduce reducer
        else
          tuple.reduce(reducer, lhs)

      pipe-reduce
        value
        ops
        (acc, op) ->
          if (op.call?())
            `(~`acc).(~`op.at 0)(~`op.at 1)
          else
            `(~`acc).(~`op)


  #keepmacro fun
    binaryKeyword
    LOW
    expand: (name, lambdas) ->
      #external gensym

      var anonymous? = name && (!lambdas || lambdas.placeholder?())
      if anonymous?
        lambdas = name
        name = ast.new-tag(gensym())

      var fun-name = arity ->
        var tag = name.get-tag()
        var special-suffix = RegExp('[!?]$').exec(tag)
        if (special-suffix) do
          var idx = special-suffix.index
          tag.substring(0, idx) + '$' + arity + tag.substring(idx)
        else
          tag + '$' + arity

      var fun-tag = arity ->
        name.new-tag(fun-name arity)

      var rest? = binding ->
        binding.id == '&'

      var variadic? = lambda ->
        var bindings = lambda.at 0
        if (bindings.tuple?()) do
          var len = bindings.count
          len > 0 && rest?(bindings.at(len - 1))
        else
          rest? bindings

      var ->args = bindings ->
        var index = 0
        ast.new-tuple
          bindings.map
            b ->
              var i = b.new-value index
              index += 1
              if (rest? b)
                `Array.prototype.slice.call(arguments, ~`i)
              else
                `arguments[~`i]

      #external ->array
      var reducer = (acc, lambda) ->
        if (lambda.id != '->')
          throw Error('expecting lambda, got `' + lambda.to-expression-string() + "'")
        var bindings = lambda.at(0).as-tuple()
        var arity = bindings.count
        var fun-condition = if (variadic? lambda)
            `arguments.length >= ~`lambda.new-value(arity - 1)
          else
            `arguments.length == ~`lambda.new-value(arity)

        do `
          if (~`fun-condition) do
            (~`fun-tag arity)(~`(->args bindings))
          else do
            ~`acc

      #external declaration
      var destructuring? = p ->
        if (rest? p)
          destructuring?(p.at 1)
        else
          !p.tag?()

      var ->parameter = (p, index) ->
        if (destructuring? p)
          p.new-tag('p$' + index)
        else if (rest? p)
          p.at(1).copy()
        else
          p.copy()

      var expand-lambda = lambda ->
        var bindings = lambda.at(0).map(_ -> _)
        var parameters = bindings.map ->parameter
        var lambda-body = lambda.at 1
        var final-body = bindings |.>
          map
            (binding, index) -> [binding, parameters[index]]
          filter
            binding-and-parameter -> destructuring?(binding-and-parameter[0])
          reduce-right
            (acc, e) ->
              var binding = e[0]
              var parameter = e[1]
              `
                #let ((~`if (rest? binding) (binding.at 1) else binding) = (~`parameter))
                  ~`acc
            lambda-body

        `(~`lambda.new-tuple parameters) -> ~`final-body

      var lambdas-array = ->array lambdas
      if (lambdas-array.length == 1 && !variadic?(lambdas-array[0]))
        `
          var ~`declaration(name) = ~`expand-lambda(lambdas-array[0])

      else do
        var decls = lambdas-array.map
          lambda ->
            var arity = lambda.at(0).count
            var tag = lambda.new-tag(fun-name arity)
            do `
              var ~`declaration(tag) = ~`(expand-lambda lambda)

        var default-body = #quote throw Error('invalid arity (' + arguments.length + ')')

        var body = lambdas-array.reduce-right(reducer, default-body)

        `
          var ~`declaration(name) = do
            ~`decls
            () ->
              #external arguments
              ~`body


  #keepmacro #defmulti
    binaryKeyword
    LOW
    expand: (name, lambda) ->

      if !(name && lambda)
        throw Error('#defmulti <name> <lambda>')

      name.handle-as-tag-declaration()

      var args = ast.new-tuple
        lambda.at(0).map(_ -> _.copy())

      var result = `
        var (~`name) = do
          var \multi = {name: ~`(ast.new-value(name.get-tag())), dispatch-table: {}}
          var \dispatcher = (~`lambda.at 0) ->
            var \value = ~`lambda.at 1
            if (var \method = (\multi.dispatch-table[\value] || \multi.dispatch-table['default']))
              \method (~`args)
            else
              throw Error("no method `" + \value + "' on " + '`' + \multi.name + "'")
          \dispatcher.multi = \multi
          \dispatcher
      result.resolve-virtual()
      result


  #keepmacro #defmethod
    ternaryKeyword
    LOW
    expand: (multi, value, lambda) ->
      if !(multi && value && lambda)
        throw Error('#defmethod <multi-name> <value> <lambda>')
      `do
        (~`multi).multi.dispatch-table[~`value] = fun ~`lambda


  #keepmacro #defprotocol
    binaryKeyword
    LOW
    expand: (name, body) ->
      var name-val = name.new-value name.val
      var fns = body.as-tuple ().map #->
        if !(#it.call? ())
          throw Error ('Unsupported protocol method definition: `' + #it.print-ast () + "'")
        var (f, args) = (#it.at 0, #it.at (1).as-tuple ())
        `(~`f):
          fun (~`f) (~`args) ->
            var self = (~`args.at 0)
            var vtable = self[(~`name).$id$]
            if vtable
              vtable.(~`f) (~`args)
            else
              throw Error
                '`' + (~`name-val) + "' protocol not supported by `" + self + "'"

      var name-decl = name.new-tag name.val
      name-decl.handle-as-tag-declaration ()
      `
        #no-new-scope do
          var (~`name-decl) = {
            $id$: (~`name-val) + '_' + Math.random ().to-string (36).substr (2)
            $extend$: (value, vtable) ->
              (value.prototype || value)[(~`name).$id$] = vtable
            (~`fns)
          }
          (~`name)


  #keepmacro #extend
    ternaryKeyword
    LOW
    expand: (name, value, body) ->
      var fns = body.as-tuple ().map #->
        var (n, lambda) = (#it.at 0, #it.at 1)
        `((~`n): ~`lambda)
      `
        (~`name).$extend$ (~`value, {~`fns})


  #keepmacro refer
    binaryKeyword
    HIGH
    expand: (ns, syms) ->

      "refers to members of a namespace"

      "USAGE:"

      "* single member"

      "  refer mori map"

      "   => "
      "  var map = mori.map"

      "* multiple members (array or tuple)"

      "  refer mori [hash_map, vector]"

      "   => "
      "  var (hash_map, vector) = (mori.hash_map, mori.vector)"

      " also works with tuples:"

      "  refer mori (hash_map, vector)"

      " or "
      "  refer mori"
      "    hash_map"
      "    vector"

      var ref = tag ->
        `(~`ns) . ~`tag

      var vars = (syms, vals) ->
        `(var (~`syms) = (~`vals))

      #external declaration
      var single-var = tag ->
        vars
          declaration tag
          ref tag

      if (syms.tag?())
        single-var syms

      else if (syms.count == 1) do
        var tag = syms.at 0
        single-var tag

      else do
        var tuple-of = fn -> ast.new-tuple(syms.map(fn))
        vars
          tuple-of declaration
          tuple-of ref


  #keepmacro ::
    unary
    HIGH
    expand: v ->

      'mori value literals'

      if (v.object?()) do
        var kvs = v.new-tuple()
        v.for-each(p -> do
          var k = p.at 0
          kvs.push(k.new-value(k.val))
          kvs.push(p.at(1).copy()))
        `mori.hash_map(~`kvs)

      else if (v.array?()) do
        var vs = v.new-tuple(v.map(e -> e.copy()))
        `mori.vector(~`vs)

      else if (v.tuple?()) do
        `mori.list(~`v)

      else if (v.tag?())
        v.new-value(v.get-tag())

      else
        v


  #keepmacro !!
    binary
    MUL
    expand: (coll, path) ->

      "associative collection navigation"
      "  by single key: coll !! key"
      "  by path: coll !! (k0, k1, kn)"

      if (path.tuple?())
        ` mori.get_in(~`coll, [~`path.map(_ -> _)])
      else
        ` mori.get(~`coll, ~`path)


  #keepmacro case
    binaryKeyword
    LOW
    expand: () ->
      #external (->array, gensym)
      var expression = ast.at 0
      var cases = ->array ast.at 1
      var case-var = ast.new-tag gensym '_case_'

      ;reverse walk the cases building the if/else tree bottom up"
      var reducer = (acc, c) ->
        `
          if (mori.equals(~`case-var, ~`c.at 0))
            ~`c.at 1
          else
            ~`acc

      var last-case-idx = cases.length - 1
      var last-case = cases[last-case-idx]
      var default-case =
        if (last-case.id == 'else') do
          cases = cases.splice (0, last-case-idx)
          last-case.at 0
        else
          `throw Error('unmatched case `' + (~`expression.new-value(expression.print-ast())) + "' (" + (~`case-var) + ")")

      #external declaration
      `
        do
          var (~`declaration(case-var)) = ~`expression
          ~`cases.reduce-right(reducer, default-case)


#keep-meta

  var declaration = tag ->
    var d = tag.new-tag(tag.get-tag())
    d.handle-as-tag-declaration()
    d

  var ->array = node ->
    if (!node) []
    else if (node.tuple?()) node.map(_ -> _)
    else [node]

  var gensym = optional-prefix ->
    (optional-prefix || '_') + Math.random().to-string(36).substr(2, 9)

  var pipe-reduce = (lhs, rhs, reducer) ->
    var tuple = rhs.as-tuple()
    if (lhs.placeholder?())
      tuple.map(it -> it).reduce reducer
    else
      tuple.reduce(reducer, lhs)
