require('source-map-support').install()

#metaimport 'macros'

var mori = require 'mori'
var Benchmark = require 'benchmark'

fun run benchmark ->
  benchmark |.>
    on
      'cycle'
      event -> console.log(String(event.target))
    on
      'complete'
      () ->
        var factor = this.filter('fastest').pluck('hz') / this.filter('slowest').pluck('hz')
        var percent = Math.round((factor - 1) * 100)
        console.log(this.filter('fastest').pluck('name') + ' is the fastest (~' + percent + '%).')
    run()


var regular-function = (x, y) -> x + y
fun fun-function (x, y) -> x + y

run
  new Benchmark.Suite() |.>
    add
      'fun function call'
      () -> fun-function(21, 21)

    add
      'regular function call'
      () -> regular-function(21, 21)


var regular-vector-destructuring = (args) -> args[0] + args[1]
fun fun-vector-destructuring [x, y] -> x + y
var v = [21, 21]

run
  new Benchmark.Suite() |.>
    add
      'fun vector destructuring'
      () -> fun-vector-destructuring v

    add
      'regular vector destructuring'
      () -> regular-vector-destructuring v


var regular-obj-destructuring = (args) -> args.x * args.y
fun fun-obj-destructuring {x, y} -> x * y
var o = {x: 21, y: 21}

run
  new Benchmark.Suite() |.>
    add
      'fun object destructuring'
      () -> fun-obj-destructuring o

    add
      'regular object destructuring'
      () -> regular-obj-destructuring o


var m = ::{x: 21, y: 21}

run
  new Benchmark.Suite() |.>
    add
      'fun object destructuring'
      () -> fun-obj-destructuring o

    add
      'fun map destructuring'
      () -> fun-obj-destructuring m
