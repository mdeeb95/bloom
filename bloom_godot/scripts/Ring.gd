extends Node2D

const PetalScene = preload("res://scenes/Petal.tscn")

signal petal_clicked(ring_id, petal_id)

var id: int
var petals: Array = []
var rotation_offset: float = 0.0

func setup(p_id: int, config: Dictionary, colors: Dictionary):
	id = p_id
	var count = config.count
	var radius = config.radius
	var petal_size = config.petalSize
	
	# Random rotation offset for variety
	rotation_offset = randf_range(0, 360)
	rotation_degrees = rotation_offset
	
	# Find the odd petal index
	var odd_index = randi() % count
	
	for i in range(count):
		var angle = (float(i) / count) * 360.0
		var petal = PetalScene.instantiate()
		add_child(petal)
		
		var is_odd = (i == odd_index)
		var color = colors.odd if is_odd else colors.primary
		
		petal.setup("petal_%d_%d" % [id, i], angle, color, petal_size, radius, is_odd)
		petal.clicked.connect(_on_petal_clicked)
		petals.append(petal)

func bloom():
	var stagger = max(
		GameLogic.ANIMATION_CONFIG.BLOOM.MIN_STAGGER,
		GameLogic.ANIMATION_CONFIG.BLOOM.BASE_STAGGER / (petals.size() / 8.0)
	)
	
	for i in range(petals.size()):
		petals[i].bloom(i * stagger)

func set_active(active: bool):
	for petal in petals:
		petal.is_active = active
	
	# Dim non-active rings slightly like web filter brightness-95
	var target_mod = 1.0 if active else 0.95
	create_tween().tween_property(self, "modulate:v", target_mod, 0.5)

func update_scaling(ring_index: int, total_rings: int):
	var rings_from_outermost = total_rings - 1 - ring_index
	var target_scale = max(
		GameLogic.LAYOUT_CONFIG.MIN_RING_SCALE,
		1.0 - (rings_from_outermost * GameLogic.LAYOUT_CONFIG.RING_SHRINK_FACTOR)
	)
	
	var tween = create_tween()
	tween.tween_property(self, "scale", Vector2(target_scale, target_scale), 1.0)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	
	# Z-index management: outer rings go behind (lower index)
	# total_rings is 1-based, ring_index is 0-based
	z_index = 90 - ring_index

func scatter():
	for petal in petals:
		petal.scatter()
	# Remove self after petals are gone? Or wait for them?
	# The petals handle their own removal. We can remove the ring node soon.
	get_tree().create_timer(5.0).timeout.connect(queue_free)

func _on_petal_clicked(petal_id: String):
	petal_clicked.emit(id, petal_id)

func get_petal(petal_id: String):
	for p in petals:
		if p.id == petal_id:
			return p
	return null
