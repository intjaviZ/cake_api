-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `telefono` VARCHAR(20) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `rol` ENUM('CLIENTE', 'REPOSTERA') NOT NULL DEFAULT 'CLIENTE',

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pasteles_catalogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `permite_relleno` BOOLEAN NOT NULL DEFAULT true,
    `precio_base_porcion` DECIMAL(10, 2) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rellenos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cliente_id` INTEGER NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_entrega_esperada` DATETIME(3) NOT NULL,
    `estado` ENUM('ORDENADO', 'PAGADO', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'ORDENADO',
    `total_estimado` DECIMAL(10, 2) NOT NULL,
    `metodo_pago` VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO_FISICO',
    `notas_entrega` TEXT NULL,
    `fecha_pago` DATETIME(3) NULL,
    `monto_recibido` DECIMAL(10, 2) NULL,
    `fecha_entrega_real` DATETIME(3) NULL,
    `motivo_cancelacion` VARCHAR(200) NULL,
    `fecha_cancelacion` DATETIME(3) NULL,
    `cancelado_por` ENUM('CLIENTE', 'REPOSTERA') NULL,

    INDEX `pedidos_cliente_id_idx`(`cliente_id`),
    INDEX `pedidos_estado_idx`(`estado`),
    INDEX `pedidos_fecha_creacion_idx`(`fecha_creacion`),
    INDEX `pedidos_fecha_entrega_esperada_idx`(`fecha_entrega_esperada`),
    INDEX `pedidos_fecha_pago_idx`(`fecha_pago`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items_pedido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `pastel_catalogo_id` INTEGER NOT NULL,
    `relleno_id` INTEGER NULL,
    `porciones_totales` INTEGER NOT NULL,
    `color_primario` VARCHAR(30) NOT NULL,
    `color_secundario` VARCHAR(30) NOT NULL,
    `dedicatoria` VARCHAR(50) NULL,
    `precio_unitario` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `distribuciones_torta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_pedido_id` INTEGER NOT NULL,
    `porciones_torta` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_pedido` ADD CONSTRAINT `items_pedido_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_pedido` ADD CONSTRAINT `items_pedido_pastel_catalogo_id_fkey` FOREIGN KEY (`pastel_catalogo_id`) REFERENCES `pasteles_catalogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_pedido` ADD CONSTRAINT `items_pedido_relleno_id_fkey` FOREIGN KEY (`relleno_id`) REFERENCES `rellenos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distribuciones_torta` ADD CONSTRAINT `distribuciones_torta_item_pedido_id_fkey` FOREIGN KEY (`item_pedido_id`) REFERENCES `items_pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
