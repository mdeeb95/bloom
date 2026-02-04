extends Node

func _ready():
	print("--- Testing GameLogic ---")
	if has_node("/root/GameLogic"):
		print("GameLogic Autoload found.")
		
		# Test Fibonacci
		var fib_result = GameLogic.fibonacci(5)
		print("Fibonacci(5) = ", fib_result, " (Expected: 5)")
		assert(fib_result == 5)
		
		# Test Ring Config
		var config = GameLogic.get_ring_config(1)
		print("Level 1 Config: ", config)
		# count = min(fib(1+5), 34) = min(fib(6), 34) = min(8, 34) = 8
		assert(config.count == 8)
		
		# Test Color Generation
		var colors = GameLogic.generate_round_colors(1)
		print("Colors generated: ", colors)
		assert(colors.has("primary"))
		assert(colors.has("odd"))
		
		print("GameLogic test complete.")
		get_tree().quit()
	else:
		push_error("GameLogic Autoload NOT found!")
		get_tree().quit(1)
