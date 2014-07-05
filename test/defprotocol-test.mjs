#external (describe, it)

#metaimport '..'

refer (require 'chai') expect

#defmacro #defprotocol
  binaryKeyword
  LOW
  expand: (name, body) ->
    name.handle-as-tag-declaration ()

    var id = name.val + '_' + Math.random ().to-string (36).substr (2)
    var id-val = name.new-value id
    var fns = body.as-tuple ().map #->
      assert! #it.call? ()
      var (f, args) = (#it.at 0, #it.at (1).as-tuple ())
      `
        fun (~`f) (~`args) ->
          var self = (~`args.at 0)
          var vtable = self[~`id-val]
          if vtable
            vtable.(~`f) (~`args)
          else
            throw Error
              '`' + (~`name.new-value name.val) + '\' protocol not supported by `' + self + "'"
    `
      #no-new-scope do
        var (~`name) = {
          id: ~`id-val
          extend: (value, vtable) ->
            (value.prototype || value)[~`id-val] = vtable
        }
        ~`fns

#defmacro #extend
  ternaryKeyword
  LOW
  expand: (name, value, body) ->
    var fns = body.as-tuple ().map #->
      var (n, lambda) = (#it.at 0, #it.at 1)
      `((~`n): ~`lambda)
    `
      (~`name).extend (~`value, {~`fns})


describe
  '#defprotocol'
  #->
    it
      'can define single function protocols'
      #->
        #defprotocol Countable
          count coll
        #extend Countable String
          count s -> s.length
        expect (count '42').to.equal 2


describe
  '#extend'
  #->

    #defprotocol Startable
      start o

    it
      'can extend protocols to classes'
      #->
        fun Server () ->
          this.started = false

        #extend Startable Server
          start s ->
            s.started = true

        var s = new Server ()
        start s
        (expect s.started).to.equal true

    it
      'can extend protocols to objects'
      #->
        var a = {}

        #extend Startable a
          start o ->
            o.started = true

        start a
        (expect a.started).to.equal true

    it
      'throws for unsupported protocol'
      #->
        var action = #-> start {}
        (expect action).to.throw "`Startable' protocol not supported by `[object Object]'"
