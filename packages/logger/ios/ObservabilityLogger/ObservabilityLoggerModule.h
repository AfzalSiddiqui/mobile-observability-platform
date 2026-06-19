#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <ObservabilityLoggerSpec/ObservabilityLoggerSpec.h>

@interface ObservabilityLoggerModule : RCTEventEmitter <NativeObservabilityLoggerSpec>
#else
@interface ObservabilityLoggerModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
