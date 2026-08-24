// React 19 + @react-three/test-renderer: khai báo môi trường act để bớt cảnh báo.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
