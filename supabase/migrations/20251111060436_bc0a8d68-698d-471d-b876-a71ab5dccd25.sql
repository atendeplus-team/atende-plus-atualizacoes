-- Adicionar campo para tipo de mídia (imagem ou vídeo)
ALTER TABLE propaganda_slides 
ADD COLUMN media_type VARCHAR(10) DEFAULT 'image' CHECK (media_type IN ('image', 'video'));

-- Atualizar slides existentes para tipo imagem
UPDATE propaganda_slides SET media_type = 'image' WHERE media_type IS NULL;

-- Adicionar campo para tipo de transição
ALTER TABLE propaganda_slides 
ADD COLUMN transition_type VARCHAR(20) DEFAULT 'fade' CHECK (transition_type IN ('fade', 'slide', 'zoom', 'none'));