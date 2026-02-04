extends Node2D

const PetalScene = preload("res://scenes/Petal.tscn")

func _ready():
	print("Starting Petal Render Diagnostic Test...")
	
	# Test 1: Single Petal Geometry
	var petal = PetalScene.instantiate()
	add_child(petal)
	petal.position = Vector2(200, 300)
	petal.setup("test_petal", 0, Color.REBECCA_PURPLE, 100.0, 0.0, false)
	
	print("Petal 1 Points: ", petal.get_node("Polygon2D").polygon)
	if petal.get_node("Polygon2D").polygon.size() == 0:
		print("FAILED: Petal 1 has no polygon points!")
	else:
		print("SUCCESS: Petal 1 has ", petal.get_node("Polygon2D").polygon.size(), " points.")

	# Test 2: Animation State
	print("Testing Bloom Animation...")
	petal.bloom(0.0)
	
	# Wait a frame to check initial tween state
	await get_tree().process_frame
	print("Petal Scale after 1 frame: ", petal.scale)
	print("Petal Modulate after 1 frame: ", petal.modulate.a)
	
	# Test 3: Multiple Petals in a Ring
	var center = Vector2(600, 300)
	var count = 8
	var radius = 100.0
	var size = 50.0
	
	for i in range(count):
		var p = PetalScene.instantiate()
		add_child(p)
		var angle = (float(i) / count) * 360.0
		p.setup("ring_petal_%d" % i, angle, Color.DEEP_SKY_BLUE, size, radius, false)
		p.position += center
		p.bloom(i * 0.1)
	
	print("Diagnostic Scene Setup Complete. Check output for scale/modulate values.")
	
	# Verify GameLogic constants
	print("GameLogic.ANIMATION_CONFIG.BLOOM.DURATION: ", GameLogic.ANIMATION_CONFIG.BLOOM.DURATION)
	
	# Keep running for a bit to see animations if using editor, but for automated test we can exit
	if OS.get_name() == "Headless":
		await get_tree().create_timer(2.0).timeout
		get_tree().quit()
